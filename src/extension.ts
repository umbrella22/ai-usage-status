/**
 * AI Usage Status - Extension Entry Point
 *
 * Multi-provider AI usage monitoring for VS Code.
 * Supports MiniMax, ZHIPU/ZAI, and extensible provider architecture.
 */

import * as vscode from "vscode";
import { ProviderRegistry } from "./providers/registry";
import { StatusBarManager } from "./ui/statusBar";
import { showSettingsPanel } from "./ui/settingsPanel";
import { t, getLanguage } from "./ui/i18n";
import type { ProviderUsageData } from "./types";

export function activate(context: vscode.ExtensionContext): void {
  try {
    const registry = new ProviderRegistry(context);
    const statusBar = new StatusBarManager();

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let isSyncPaused = false;

    // ─── Core: Refresh All Providers ─────────────────────────────

    const updateStatus = async (force: boolean = false): Promise<void> => {
      if (isSyncPaused && !force) {
        return;
      }
      try {
        registry.refreshAll();
        const activeProviders = registry.getActiveProviders();

        if (activeProviders.length === 0) {
          statusBar.showNeedsConfig();
          return;
        }

        // Fetch usage from all active providers in parallel
        const results = await Promise.allSettled(
          activeProviders.map((p) => p.fetchUsage()),
        );

        const allUsageData: ProviderUsageData[] = [];
        const errors: { providerId: string; error: string }[] = [];

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === "fulfilled") {
            allUsageData.push(...result.value);
          } else {
            const provider = activeProviders[i];
            const errMsg =
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason);
            errors.push({ providerId: provider.meta.id, error: errMsg });
            console.error(`[${provider.meta.id}] Fetch failed:`, errMsg);
          }
        }

        // Update status bar with all collected data
        if (allUsageData.length > 0) {
          statusBar.update(allUsageData);

          // 当token用量为100%时暂停同步
          const reach100 = allUsageData.some(
            (d) => d.primaryUsage.percentage >= 100,
          );
          isSyncPaused = reach100;
        }

        // Show errors for failed providers
        for (const err of errors) {
          statusBar.showError(err.providerId, err.error);
        }
      } catch (error) {
        console.error(
          "AI Usage Status update failed:",
          (error as Error).message,
        );
      }
    };

    // ─── Setup Interval ──────────────────────────────────────────

    const setupInterval = (): void => {
      if (intervalId) clearInterval(intervalId);

      const config = vscode.workspace.getConfiguration("aiUsageStatus");
      // Use configured interval or default to 60 seconds
      const interval = config.get<number>("refreshInterval", 60) * 1000;
      intervalId = setInterval(() => updateStatus(), interval);
    };

    // ─── Initial State ───────────────────────────────────────────

    const activeProviders = registry.getActiveProviders();
    if (activeProviders.length === 0) {
      statusBar.showNeedsConfig();

      // Show welcome message after a brief delay
      setTimeout(() => {
        const language = getLanguage();
        const msg =
          language === "en-US"
            ? "Welcome to AI Usage Status! Configure your AI providers to get started."
            : "欢迎使用 AI Usage Status！请配置您的 AI 供应商以开始使用。";
        vscode.window
          .showInformationMessage(
            msg,
            language === "en-US" ? "Configure Now" : "立即配置",
            language === "en-US" ? "Later" : "稍后",
          )
          .then((selection) => {
            if (selection === "立即配置" || selection === "Configure Now") {
              vscode.commands.executeCommand("aiUsageStatus.setup");
            }
          });
      }, 2000);
    } else {
      statusBar.showLoading();
      updateStatus(true);
    }

    setupInterval();

    // ─── Register Commands ───────────────────────────────────────

    const refreshDisposable = vscode.commands.registerCommand(
      "aiUsageStatus.refresh",
      () => updateStatus(true),
    );

    const setupDisposable = vscode.commands.registerCommand(
      "aiUsageStatus.setup",
      async () => {
        const allProviders = registry.getAllProviders();
        const panel = await showSettingsPanel(context, allProviders, () => {
          registry.refreshAll();
          setupInterval();
          updateStatus(true);
        });
        context.subscriptions.push(panel);
      },
    );

    // ─── Configuration Change Listener ───────────────────────────

    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (e.affectsConfiguration("aiUsageStatus")) {
          registry.refreshAll();
          setupInterval();
          updateStatus(true);
        }
      },
    );

    // ─── Subscriptions ───────────────────────────────────────────

    context.subscriptions.push(
      refreshDisposable,
      setupDisposable,
      configChangeDisposable,
      {
        dispose: () => {
          if (intervalId) clearInterval(intervalId);
          statusBar.disposeAll();
          registry.dispose();
        },
      },
    );
  } catch (error) {
    console.error(
      "AI Usage Status extension activation failed:",
      (error as Error).message,
    );
    vscode.window.showErrorMessage(
      "AI Usage Status 扩展激活失败: " + (error as Error).message,
    );
  }
}

export function deactivate(): void {
  // Cleanup handled by subscription disposables
}
