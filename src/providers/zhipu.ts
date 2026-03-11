/**
 * ZAI / 智谱 Provider
 *
 * Supports both api.z.ai and open.bigmodel.cn endpoints.
 * Queries model usage, tool usage, and quota limits.
 */

import * as vscode from "vscode";
import { httpRequest } from "../utils/http";
import { formatDateTime } from "../utils/format";
import { getLanguage, t } from "../ui/i18n";
import type {
  AIProvider,
  ProviderMeta,
  ProviderUsageData,
  UsageMetric,
} from "../types";

// ─── API Response Types ─────────────────────────────────────────────

interface ModelUsageItem {
  modelName: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

interface ToolUsageItem {
  toolName: string;
  totalCalls: number;
}

interface QuotaLimit {
  type: string;
  percentage: number;
  currentValue?: number;
  usage?: number;
  usageDetails?: unknown;
}

interface ModelUsageResponse {
  data?: ModelUsageItem[];
}

interface ToolUsageResponse {
  data?: ToolUsageItem[];
}

interface QuotaLimitResponse {
  data?: {
    limits?: QuotaLimit[];
  };
}

// ─── Provider Implementation ────────────────────────────────────────

export class ZhipuProvider implements AIProvider {
  readonly meta: ProviderMeta = {
    id: "zhipu",
    name: "ZAI",
    description: "ZAI AI usage query",
    configFields: [
      {
        key: "authToken",
        label: "Auth Token",
        type: "password",
        placeholder: "Enter auth token",
        description: "ZAI auth token (required)",
        required: true,
      },
      {
        key: "baseUrl",
        label: "Platform URL",
        type: "select",
        options: [
          { label: "ZAI (api.z.ai)", value: "https://api.z.ai" },
          {
            label: "ZAI (open.bigmodel.cn)",
            value: "https://open.bigmodel.cn",
          },
        ],
        defaultValue: "https://open.bigmodel.cn",
        description: "Select platform URL",
        required: true,
      },
      {
        key: "modelName",
        label: "Model",
        type: "text",
        placeholder: "Auto-select if empty",
        description:
          "Choose the model name to display (auto-detected if empty)",
      },
    ],
  };

  private authToken = "";
  private baseUrl = "https://open.bigmodel.cn";
  private modelName = "";

  constructor(private readonly context: vscode.ExtensionContext) {
    this.loadConfig();
  }

  isConfigured(): boolean {
    return !!(this.authToken && this.baseUrl);
  }

  loadConfig(): void {
    this.applyLocalization();

    const config = vscode.workspace.getConfiguration("aiUsageStatus.zhipu");
    this.authToken = config.get("authToken", "");
    this.baseUrl = config.get("baseUrl", "https://open.bigmodel.cn");
    this.modelName = config.get("modelName", "");
  }

  async fetchUsage(): Promise<ProviderUsageData[]> {
    this.loadConfig();

    const language = getLanguage();

    if (!this.authToken || !this.baseUrl) {
      throw new Error(t("provider.zhipu.configError", language));
    }

    const platform = this.baseUrl.includes("api.z.ai")
      ? "ZAI"
      : t("provider.zhipu.name", language);

    // Build time window: yesterday same hour -> today same hour
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      now.getHours(),
      0,
      0,
      0,
    );
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      59,
      59,
      999,
    );

    const timeParams = {
      startTime: formatDateTime(startDate),
      endTime: formatDateTime(endDate),
    };

    const headers = {
      Authorization: this.authToken,
      "Accept-Language": "en-US,en",
      "Content-Type": "application/json",
    };

    // Fetch all three endpoints in parallel
    const [modelResp, toolResp, quotaResp] = await Promise.all([
      httpRequest<ModelUsageResponse>({
        url: `${this.baseUrl}/api/monitor/usage/model-usage`,
        params: timeParams,
        headers,
      }).catch((err) => {
        console.error(
          "[zhipu] Model usage fetch failed:",
          (err as Error).message,
        );
        return null;
      }),
      httpRequest<ToolUsageResponse>({
        url: `${this.baseUrl}/api/monitor/usage/tool-usage`,
        params: timeParams,
        headers,
      }).catch((err) => {
        console.error(
          "[zhipu] Tool usage fetch failed:",
          (err as Error).message,
        );
        return null;
      }),
      httpRequest<QuotaLimitResponse>({
        url: `${this.baseUrl}/api/monitor/usage/quota/limit`,
        headers,
      }).catch((err) => {
        console.error(
          "[zhipu] Quota limit fetch failed:",
          (err as Error).message,
        );
        return null;
      }),
    ]);

    // Parse quota limits
    const metrics: UsageMetric[] = [];
    let primaryUsage: UsageMetric = {
      label: t("usageSummary", getLanguage()),
      used: 0,
      total: 100,
      percentage: 0,
    };

    if (quotaResp?.data?.data?.limits) {
      for (const limit of quotaResp.data.data.limits) {
        if (limit.type === "TOKENS_LIMIT") {
          const metric: UsageMetric = {
            label: t("zhipu.tokenUsage5h", getLanguage()),
            used: Math.round(limit.percentage),
            total: 100,
            percentage: limit.percentage,
            unit: "%",
          };
          metrics.push(metric);
          primaryUsage = metric;
        } else if (limit.type === "TIME_LIMIT") {
          const metric: UsageMetric = {
            label: t("zhipu.mcpUsageMonth", getLanguage()),
            used: limit.currentValue ?? Math.round(limit.percentage),
            total: limit.usage ?? 100,
            percentage: limit.percentage,
            unit: "calls",
          };
          metrics.push(metric);
          // Use TIME_LIMIT as primary if no TOKENS_LIMIT
          if (primaryUsage.label === t("usageSummary", getLanguage())) {
            primaryUsage = metric;
          }
        }
      }
    }

    // Parse model usage for additional info
    let totalTokens = 0;
    const modelNames: string[] = [];
    if (modelResp?.data?.data) {
      const modelData = Array.isArray(modelResp.data.data)
        ? modelResp.data.data
        : [];
      for (const item of modelData) {
        totalTokens += item.totalTokens || 0;
        if (item.modelName) modelNames.push(item.modelName);
      }
      if (totalTokens > 0) {
        metrics.push({
          label: t("provider.zhipu.tokenUsage24h", getLanguage()),
          used: totalTokens,
          total: totalTokens,
          percentage: 100,
          unit: "tokens",
        });
      }
    }

    // Parse tool usage
    let totalToolCalls = 0;
    if (toolResp?.data?.data) {
      const toolData = Array.isArray(toolResp.data.data)
        ? toolResp.data.data
        : [];
      for (const item of toolData) {
        totalToolCalls += item.totalCalls || 0;
      }
      if (totalToolCalls > 0) {
        metrics.push({
          label: t("provider.zhipu.toolUsage24h", getLanguage()),
          used: totalToolCalls,
          total: totalToolCalls,
          percentage: 100,
          unit: "calls",
        });
      }
    }

    // If no metrics from quota, create a summary metric
    if (
      primaryUsage.label === t("usageSummary", getLanguage()) &&
      totalTokens > 0
    ) {
      primaryUsage = {
        label: t("provider.zhipu.tokenUsage", getLanguage()),
        used: totalTokens,
        total: totalTokens,
        percentage: 0, // No limit info available
        unit: "tokens",
      };
    }

    // Use configured model name, or fall back to auto-detected names
    const displayModelName =
      this.modelName ||
      (modelNames.length > 0 ? modelNames.join(", ") : undefined);

    return [
      {
        providerId: "zhipu",
        providerName: platform,
        primaryUsage,
        metrics,
        modelName: displayModelName,
        availableModels: modelNames,
        timeWindow: {
          start: formatDateTime(startDate),
          end: formatDateTime(endDate),
        },
      },
    ];
  }

  dispose(): void {
    // No resources to clean up
  }

  private applyLocalization(): void {
    const language = getLanguage();

    this.meta.name = t("provider.zhipu.name", language);
    this.meta.description = t("provider.zhipu.description", language);

    this.meta.configFields = [
      {
        key: "authToken",
        label: t("provider.zhipu.authToken", language),
        type: "password",
        placeholder: t("provider.zhipu.authTokenPlaceholder", language),
        description: t("provider.zhipu.authTokenDescription", language),
        required: true,
      },
      {
        key: "baseUrl",
        label: t("provider.zhipu.baseUrl", language),
        type: "select",
        options: [
          { label: "ZAI (api.z.ai)", value: "https://api.z.ai" },
          {
            label: t("provider.zhipu.baseUrlZhipu", language),
            value: "https://open.bigmodel.cn",
          },
        ],
        defaultValue: "https://open.bigmodel.cn",
        description: t("provider.zhipu.baseUrlDescription", language),
        required: true,
      },
      {
        key: "modelName",
        label: t("provider.zhipu.modelName", language),
        type: "text",
        placeholder: t("provider.zhipu.modelNamePlaceholder", language),
        description: t("provider.zhipu.modelNameDescription", language),
      },
    ];
  }
}
