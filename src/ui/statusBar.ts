/**
 * Status Bar Manager
 *
 * Creates and manages one status bar item per active provider.
 * Each provider gets its own clickable status bar button.
 */

import * as vscode from "vscode";
import type { ProviderUsageData, Language } from "../types";
import {
  formatNumber,
  formatPercentage,
  translateRemainingTime,
  translateExpiryText,
} from "../utils/format";
import { t, getLanguage } from "./i18n";

/** Represents a single status bar entry */
interface StatusBarEntry {
  item: vscode.StatusBarItem;
  providerId: string;
  subLabel?: string;
}

export class StatusBarManager {
  private entries: StatusBarEntry[] = [];
  private nextPriority = 100;
  private static readonly TOOLTIP_SETTINGS_COMMAND = "aiUsageStatus.setup";

  constructor() {}

  /**
   * Update the status bar with usage data from all providers.
   * Creates/removes status bar items as needed.
   */
  update(allUsageData: ProviderUsageData[]): void {
    const language = getLanguage();

    // Build a key for each usage data entry
    const dataKeys = new Set(allUsageData.map((d) => this.makeKey(d)));

    // Remove entries that no longer have data
    this.entries = this.entries.filter((entry) => {
      const key = `${entry.providerId}:${entry.subLabel || ""}`;
      if (!dataKeys.has(key)) {
        entry.item.dispose();
        return false;
      }
      return true;
    });

    // Update or create entries for each usage data
    for (const data of allUsageData) {
      const key = this.makeKey(data);
      let entry = this.entries.find(
        (e) => `${e.providerId}:${e.subLabel || ""}` === key,
      );

      if (!entry) {
        // Create new status bar item
        const item = vscode.window.createStatusBarItem(
          vscode.StatusBarAlignment.Right,
          this.nextPriority--,
        );
        item.command = StatusBarManager.TOOLTIP_SETTINGS_COMMAND;
        item.show();

        entry = { item, providerId: data.providerId, subLabel: data.subLabel };
        this.entries.push(entry);
      }

      this.updateEntry(entry, data, language);
    }
  }

  /**
   * Show loading state for all current entries, or create a default one.
   */
  showLoading(): void {
    if (this.entries.length === 0) {
      const item = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        this.nextPriority--,
      );
      item.command = StatusBarManager.TOOLTIP_SETTINGS_COMMAND;
      item.text = `$(sync~spin) AI: ${t("loading")}`;
      item.tooltip = "AI Usage Status\n" + t("loading");
      item.show();
      this.entries.push({ item, providerId: "_loading" });
    } else {
      for (const entry of this.entries) {
        entry.item.text = `$(sync~spin) ${entry.item.text.replace(/^\$\([^)]+\)\s*/, "")}`;
      }
    }
  }

  /**
   * Show "needs configuration" state.
   */
  showNeedsConfig(): void {
    this.disposeAll();

    const item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    item.command = "aiUsageStatus.setup";
    item.text = "AI: " + t("needsConfig");
    item.color = new vscode.ThemeColor("warningForeground");
    item.tooltip = "AI Usage Status\n" + t("clickToConfigure");
    item.show();

    this.entries.push({ item, providerId: "_config" });
  }

  /**
   * Show error state for a specific provider.
   */
  showError(providerId: string, message: string): void {
    const entry = this.entries.find((e) => e.providerId === providerId);
    if (entry) {
      entry.item.text = `$(warning) ${providerId}`;
      entry.item.tooltip = `${t("error")}: ${message}\n${t("clickToRefresh")}`;
      entry.item.color = new vscode.ThemeColor("errorForeground");
    }
  }

  /**
   * Get all disposable status bar items.
   */
  getDisposables(): vscode.Disposable[] {
    return this.entries.map((e) => e.item);
  }

  /**
   * Dispose all status bar items.
   */
  disposeAll(): void {
    for (const entry of this.entries) {
      entry.item.dispose();
    }
    this.entries = [];
    this.nextPriority = 100;
  }

  // ─── Private ────────────────────────────────────────────────────

  private makeKey(data: ProviderUsageData): string {
    return `${data.providerId}:${data.subLabel || ""}`;
  }

  private updateEntry(
    entry: StatusBarEntry,
    data: ProviderUsageData,
    language: Language,
  ): void {
    const { item } = entry;
    const { primaryUsage, providerName, subLabel } = data;
    const percentage = primaryUsage.percentage;

    // Color based on percentage
    if (percentage < 60) {
      item.color = new vscode.ThemeColor("charts.green");
    } else if (percentage < 85) {
      item.color = new vscode.ThemeColor("charts.yellow");
    } else {
      item.color = new vscode.ThemeColor("errorForeground");
    }

    // Status bar text
    const label = subLabel ? `${providerName}(${subLabel})` : providerName;
    if (primaryUsage.unit === "%") {
      // For ZHIPU-style percentage metrics
      item.text = `$(clock) ${label} ${formatPercentage(primaryUsage.percentage)}`;
    } else {
      item.text = `$(clock) ${label} ${formatPercentage(percentage)}`;
    }

    // Build tooltip with HTML for precise layout control
    const tooltip = new vscode.MarkdownString("", true);
    tooltip.isTrusted = true;
    tooltip.supportHtml = true;
    tooltip.supportThemeIcons = true;

    // Header: Markdown for theme icon + command link support
    const headerTitle = label;
    tooltip.appendMarkdown(
      `**${headerTitle} Usage** &nbsp; [$(settings-gear)](command:${StatusBarManager.TOOLTIP_SETTINGS_COMMAND})\n\n`,
    );
    tooltip.appendMarkdown(`---\n\n`);

    // Model name
    if (data.modelName) {
      tooltip.appendMarkdown(`${t("model", language)} ${data.modelName}\n\n`);
    }

    // Metrics: HTML table for label+usage row, progress bar below
    if (data.metrics.length > 0) {
      for (const metric of data.metrics) {
        let usageText = "";
        if (metric.unit === "%") {
          usageText = formatPercentage(metric.percentage);
        } else {
          const usedStr = formatNumber(metric.used, language);
          const totalStr = formatNumber(metric.total, language);
          usageText = `${usedStr} / ${totalStr}`;
        }

        const progressBarUri = this.createProgressBarDataUri(metric.percentage);
        tooltip.appendMarkdown(
          `<table width="100%"><tr><td><b>${metric.label}</b></td><td align="right">${usageText}</td></tr><tr><td colspan="2"><img src="${progressBarUri}" width="100%" height="3" /></td></tr></table>\n\n`,
        );
      }
    }

    // Remaining time
    if (data.remainingTime) {
      tooltip.appendMarkdown(
        `${t("remainingTime", language)}: ${translateRemainingTime(data.remainingTime, language)}\n\n`,
      );
    }

    // Expiry
    if (data.expiry) {
      tooltip.appendMarkdown(
        `${t("expiry", language)} ${data.expiry.date} (${translateExpiryText(data.expiry.text, language)})\n\n`,
      );
    }

    // Usage stats
    if (data.usageStats) {
      tooltip.appendMarkdown(`---\n\n`);
      const stats = data.usageStats;
      if (stats.lastDayUsage > 0 || stats.weeklyUsage > 0) {
        tooltip.appendMarkdown(`**${t("tokenStats", language)}**\n\n`);

        const periodLabel = language === "en-US" ? "Period" : "时间段";
        const tokensLabel = language === "en-US" ? "Tokens" : "用量";

        tooltip.appendMarkdown(
          `<table width="100%"><tr><td><b>${periodLabel}</b></td><td align="right"><b>${tokensLabel}</b></td></tr>` +
            `<tr><td>${t("yesterday", language)}</td><td align="right">${formatNumber(stats.lastDayUsage, language)}</td></tr>` +
            `<tr><td>${t("last7Days", language)}</td><td align="right">${formatNumber(stats.weeklyUsage, language)}</td></tr>` +
            `<tr><td>${t("totalUsage", language)}</td><td align="right">${formatNumber(stats.planTotalUsage, language)}</td></tr></table>\n\n`,
        );
      }
    }

    item.tooltip = tooltip;

    // Keep item actionable to ensure native hover feedback is visible and stable.
    item.command = StatusBarManager.TOOLTIP_SETTINGS_COMMAND;
  }

  private createProgressBarDataUri(percentage: number): string {
    const clamped = Math.max(0, Math.min(100, percentage));
    const width = 220;
    const height = 3;
    const radius = 1.5;
    const filledWidth = Math.round((clamped / 100) * width);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#142F46" />${filledWidth > 0 ? `<rect x="0" y="0" width="${filledWidth}" height="${height}" rx="${radius}" ry="${radius}" fill="#0064BD" />` : ""}</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
