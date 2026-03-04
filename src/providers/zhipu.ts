/**
 * ZHIPU / ZAI Provider
 *
 * Supports both api.z.ai and open.bigmodel.cn endpoints.
 * Queries model usage, tool usage, and quota limits.
 */

import * as vscode from "vscode";
import { httpRequest } from "../utils/http";
import { formatDateTime } from "../utils/format";
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
    name: "ZHIPU",
    description: "ZHIPU/ZAI AI 用量查询",
    configFields: [
      {
        key: "authToken",
        label: "认证 Token",
        type: "password",
        placeholder: "请输入认证 Token",
        description: "ANTHROPIC_AUTH_TOKEN",
        required: true,
      },
      {
        key: "baseUrl",
        label: "平台地址",
        type: "select",
        options: [
          { label: "ZAI (api.z.ai)", value: "https://api.z.ai" },
          {
            label: "ZHIPU (open.bigmodel.cn)",
            value: "https://open.bigmodel.cn",
          },
        ],
        defaultValue: "https://open.bigmodel.cn",
        description: "选择平台地址",
        required: true,
      },
      {
        key: "modelName",
        label: "模型选择",
        type: "text",
        placeholder: "留空自动选择",
        description: "选择要显示的模型名称（留空则自动从用量数据中获取）",
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
    const config = vscode.workspace.getConfiguration("aiUsageStatus.zhipu");
    this.authToken = config.get("authToken", "");
    this.baseUrl = config.get("baseUrl", "https://open.bigmodel.cn");
    this.modelName = config.get("modelName", "");
  }

  async fetchUsage(): Promise<ProviderUsageData[]> {
    this.loadConfig();

    if (!this.authToken || !this.baseUrl) {
      throw new Error("请在设置中配置 ZHIPU 认证 Token 和平台地址");
    }

    const platform = this.baseUrl.includes("api.z.ai") ? "ZAI" : "ZHIPU";

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
          "[ZHIPU] Model usage fetch failed:",
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
          "[ZHIPU] Tool usage fetch failed:",
          (err as Error).message,
        );
        return null;
      }),
      httpRequest<QuotaLimitResponse>({
        url: `${this.baseUrl}/api/monitor/usage/quota/limit`,
        headers,
      }).catch((err) => {
        console.error(
          "[ZHIPU] Quota limit fetch failed:",
          (err as Error).message,
        );
        return null;
      }),
    ]);

    // Parse quota limits
    const metrics: UsageMetric[] = [];
    let primaryUsage: UsageMetric = {
      label: "Usage",
      used: 0,
      total: 100,
      percentage: 0,
    };

    if (quotaResp?.data?.data?.limits) {
      for (const limit of quotaResp.data.data.limits) {
        if (limit.type === "TOKENS_LIMIT") {
          const metric: UsageMetric = {
            label: "Token 用量 (5小时)",
            used: Math.round(limit.percentage),
            total: 100,
            percentage: limit.percentage,
            unit: "%",
          };
          metrics.push(metric);
          primaryUsage = metric;
        } else if (limit.type === "TIME_LIMIT") {
          const metric: UsageMetric = {
            label: "MCP 用量 (月)",
            used: limit.currentValue ?? Math.round(limit.percentage),
            total: limit.usage ?? 100,
            percentage: limit.percentage,
            unit: "calls",
          };
          metrics.push(metric);
          // Use TIME_LIMIT as primary if no TOKENS_LIMIT
          if (primaryUsage.label === "Usage") {
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
          label: "24h Token 消耗",
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
          label: "24h 工具调用",
          used: totalToolCalls,
          total: totalToolCalls,
          percentage: 100,
          unit: "calls",
        });
      }
    }

    // If no metrics from quota, create a summary metric
    if (primaryUsage.label === "Usage" && totalTokens > 0) {
      primaryUsage = {
        label: "Token 使用",
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
}
