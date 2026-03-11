/**
 * MiniMax Provider
 *
 * Supports both domestic (minimaxi.com) and overseas (minimax.io) endpoints.
 * Returns one or two ProviderUsageData entries depending on configuration.
 */

import * as vscode from "vscode";
import { httpRequest, HttpError } from "../utils/http";
import { Cache } from "../utils/cache";
import { getLanguage, t } from "../ui/i18n";
import type {
  AIProvider,
  ProviderMeta,
  ProviderUsageData,
  UsageStats,
  ExpiryInfo,
  UsageMetric,
} from "../types";

// ─── API Response Types ─────────────────────────────────────────────

interface ModelRemain {
  model_name: string;
  start_time: string;
  end_time: string;
  current_interval_total_count: number;
  current_interval_usage_count: number;
  remains_time: number;
}

interface UsageApiResponse {
  model_remains: ModelRemain[];
}

interface SubscriptionData {
  current_subscribe?: {
    current_subscribe_end_time?: string;
    current_credit_reload_time?: string;
  };
}

interface BillingRecord {
  consume_token: string;
  created_at: number;
}

interface BillingApiResponse {
  charge_records: BillingRecord[];
}

// ─── Constants ──────────────────────────────────────────────────────

const ENDPOINTS = {
  remains: "/v1/api/openplatform/coding_plan/remains",
  subscription:
    "/v1/api/openplatform/charge/combo/cycle_audio_resource_package",
  billing: "/account/amount",
} as const;

// ─── Provider Implementation ────────────────────────────────────────

export class MinimaxProvider implements AIProvider {
  readonly meta: ProviderMeta = {
    id: "minimax",
    name: "MiniMax",
    description: "MiniMax AI 用量查询（支持国内/海外）",
    configFields: [
      {
        key: "token",
        label: "API Key",
        type: "password",
        placeholder: "请输入 API Key",
        description: "MiniMax 平台的 API Key",
        required: true,
      },
      {
        key: "groupId",
        label: "Group ID",
        type: "text",
        placeholder: "请输入 Group ID",
        description: "MiniMax 账号的 Group ID",
        required: true,
      },
      {
        key: "baseUrl",
        label: "平台地址",
        type: "select",
        options: [
          { label: "国内 (minimaxi.com)", value: "https://www.minimaxi.com" },
          { label: "海外 (minimax.io)", value: "https://www.minimax.io" },
        ],
        defaultValue: "https://www.minimaxi.com",
        description: "选择国内或海外平台",
        required: true,
      },
      {
        key: "modelName",
        label: "模型选择",
        type: "text",
        placeholder: "留空自动选择第一个模型",
        description: "选择要显示的模型名称",
      },
    ],
  };

  private token = "";
  private groupId = "";
  private baseUrl = "https://www.minimaxi.com";
  private modelName = "";

  private billingCache = new Cache<BillingRecord[]>(30_000);

  constructor(private readonly context: vscode.ExtensionContext) {
    this.loadConfig();
  }

  isConfigured(): boolean {
    return !!(this.token && this.groupId && this.baseUrl);
  }

  loadConfig(): void {
    this.applyLocalization();

    const config = vscode.workspace.getConfiguration("aiUsageStatus.minimax");
    this.token = config.get("token", "");
    this.groupId = config.get("groupId", "");
    this.baseUrl = config.get("baseUrl", "https://www.minimaxi.com");
    this.modelName = config.get("modelName", "");
  }

  async fetchUsage(): Promise<ProviderUsageData[]> {
    this.loadConfig();
    const language = getLanguage();

    if (!this.token || !this.groupId) {
      throw new Error(t("provider.minimax.configError", language));
    }

    const regionLabel = this.baseUrl.includes("minimax.io")
      ? t("minimax.overseas", language)
      : t("minimax.domestic", language);
    const usage = await this.fetchEndpointUsage(
      this.baseUrl,
      this.token,
      this.groupId,
      regionLabel,
    );

    return [usage];
  }

  dispose(): void {
    this.billingCache.invalidate();
  }

  // ─── Private Methods ────────────────────────────────────────────

  /** Whether the current baseUrl points to the domestic endpoint */
  private get isDomestic(): boolean {
    return !this.baseUrl.includes("minimax.io");
  }

  private async fetchEndpointUsage(
    baseUrl: string,
    token: string,
    groupId: string,
    subLabel: string,
  ): Promise<ProviderUsageData> {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    const isDomestic = !baseUrl.includes("minimax.io");

    // Fetch usage (always), subscription & billing (domestic only)
    const usagePromise = httpRequest<UsageApiResponse>({
      url: `${baseUrl}${ENDPOINTS.remains}`,
      params: { GroupId: groupId },
      headers,
    });

    // Subscription and billing APIs are only available on the domestic endpoint
    const subscriptionPromise = isDomestic
      ? httpRequest<SubscriptionData>({
          url: `${baseUrl}${ENDPOINTS.subscription}`,
          params: {
            biz_line: 2,
            cycle_type: 1,
            resource_package_type: 7,
            GroupId: groupId,
          },
          headers,
        }).catch(() => null)
      : Promise.resolve(null);

    const [usageResp, subscriptionResp] = await Promise.all([
      usagePromise,
      subscriptionPromise,
    ]);

    const apiData = usageResp.data;
    const subscriptionData = subscriptionResp?.data ?? null;

    if (!apiData.model_remains || apiData.model_remains.length === 0) {
      throw new Error(t("noUsageData", getLanguage()));
    }

    // Parse model data
    const parsed = this.parseUsageData(apiData, subscriptionData);

    // Fetch billing records (cached, domestic only)
    let usageStats: UsageStats = {
      lastDayUsage: 0,
      weeklyUsage: 0,
      planTotalUsage: 0,
    };
    if (isDomestic) {
      const cacheKey = `billing_${groupId}`;
      let billingRecords = this.billingCache.get(cacheKey);

      if (!billingRecords) {
        try {
          billingRecords = await this.fetchAllBillingRecords(
            baseUrl,
            token,
            groupId,
            10,
          );
          this.billingCache.set(cacheKey, billingRecords);
        } catch {
          billingRecords = [];
        }
      }

      if (billingRecords.length > 0) {
        const planStartTime = this.calculatePlanStartTime(subscriptionData);
        usageStats = this.calculateUsageStats(
          billingRecords,
          planStartTime,
          Date.now(),
        );
      }
    }

    return {
      providerId: "minimax",
      providerName: "MiniMax",
      subLabel,
      primaryUsage: {
        label: t("provider.minimax.codingPlan", getLanguage()),
        used: parsed.used,
        total: parsed.total,
        percentage: parsed.percentage,
        unit: "requests",
      },
      metrics: [
        {
          label: t("provider.minimax.codingPlan", getLanguage()),
          used: parsed.used,
          total: parsed.total,
          percentage: parsed.percentage,
          unit: "requests",
        },
      ],
      modelName: parsed.modelName,
      availableModels: parsed.allModels,
      timeWindow: parsed.timeWindow,
      remainingTime: parsed.remainingText,
      expiry: parsed.expiry ?? undefined,
      usageStats,
    };
  }

  private parseUsageData(
    apiData: UsageApiResponse,
    subscriptionData: SubscriptionData | null,
  ) {
    const allModels = apiData.model_remains.map((m) => m.model_name);

    // Select model
    let modelData = apiData.model_remains[0];
    if (this.modelName) {
      const found = apiData.model_remains.find(
        (m) => m.model_name === this.modelName,
      );
      if (found) modelData = found;
    }

    const used =
      modelData.current_interval_total_count -
      modelData.current_interval_usage_count;
    const total = modelData.current_interval_total_count;
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

    const remainingMs = modelData.remains_time;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const remainingText =
      hours > 0
        ? `${hours} 小时 ${minutes} 分钟后重置`
        : `${minutes} 分钟后重置`;

    const startTime = new Date(modelData.start_time);
    const endTime = new Date(modelData.end_time);

    // Expiry info
    let expiry: ExpiryInfo | null = null;
    if (subscriptionData?.current_subscribe?.current_subscribe_end_time) {
      const expiryDateStr =
        subscriptionData.current_subscribe.current_subscribe_end_time;
      const expiryDate = new Date(expiryDateStr);
      const now = new Date();
      const daysDiff = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24),
      );

      expiry = {
        date: expiryDateStr,
        daysRemaining: daysDiff,
        text:
          daysDiff > 0
            ? `还剩 ${daysDiff} 天`
            : daysDiff === 0
              ? "今天到期"
              : `已过期 ${Math.abs(daysDiff)} 天`,
      };
    }

    return {
      modelName: modelData.model_name,
      allModels,
      used,
      total,
      percentage,
      remainingText,
      timeWindow: {
        start: startTime.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Shanghai",
          hour12: false,
        }),
        end: endTime.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Shanghai",
          hour12: false,
        }),
        timezone: "UTC+8",
      },
      expiry,
    };
  }

  private calculatePlanStartTime(
    subscriptionData: SubscriptionData | null,
  ): number {
    if (subscriptionData?.current_subscribe?.current_subscribe_end_time) {
      const expiryDateStr =
        subscriptionData.current_subscribe.current_subscribe_end_time;
      const [month, day, year] = expiryDateStr.split("/").map(Number);
      if (month && day && year) {
        return new Date(year, month - 1, day - 30).getTime();
      }
    }
    return 0;
  }

  private calculateUsageStats(
    records: BillingRecord[],
    planStartTime: number,
    planEndTime: number,
  ): UsageStats {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const stats: UsageStats = {
      lastDayUsage: 0,
      weeklyUsage: 0,
      planTotalUsage: 0,
    };

    for (const record of records) {
      const tokens = parseInt(record.consume_token, 10) || 0;
      const createdAt = (record.created_at || 0) * 1000;

      if (createdAt >= yesterdayStart && createdAt < todayStart) {
        stats.lastDayUsage += tokens;
      }
      if (createdAt >= weekAgo) {
        stats.weeklyUsage += tokens;
      }
      if (createdAt >= planStartTime && createdAt <= planEndTime) {
        stats.planTotalUsage += tokens;
      }
    }

    return stats;
  }

  private async fetchAllBillingRecords(
    baseUrl: string,
    token: string,
    groupId: string,
    maxPages: number,
  ): Promise<BillingRecord[]> {
    const allRecords: BillingRecord[] = [];
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    for (let page = 1; page <= maxPages; page++) {
      try {
        const resp = await httpRequest<BillingApiResponse>({
          url: `${baseUrl}${ENDPOINTS.billing}`,
          params: { page, limit: 100, aggregate: false, GroupId: groupId },
          headers,
        });

        const records = resp.data.charge_records || [];
        if (records.length === 0) break;
        allRecords.push(...records);
        if (records.length < 100) break;
      } catch {
        break;
      }
    }

    return allRecords;
  }

  private applyLocalization(): void {
    const language = getLanguage();

    this.meta.description = t("provider.minimax.description", language);
    this.meta.configFields = [
      {
        key: "token",
        label: t("provider.minimax.token", language),
        type: "password",
        placeholder: t("provider.minimax.tokenPlaceholder", language),
        description: t("provider.minimax.tokenDescription", language),
        required: true,
      },
      {
        key: "groupId",
        label: t("provider.minimax.groupId", language),
        type: "text",
        placeholder: t("provider.minimax.groupIdPlaceholder", language),
        description: t("provider.minimax.groupIdDescription", language),
        required: true,
      },
      {
        key: "baseUrl",
        label: t("provider.minimax.baseUrl", language),
        type: "select",
        options: [
          {
            label: t("provider.minimax.baseUrlDomestic", language),
            value: "https://www.minimaxi.com",
          },
          {
            label: t("provider.minimax.baseUrlOverseas", language),
            value: "https://www.minimax.io",
          },
        ],
        defaultValue: "https://www.minimaxi.com",
        description: t("provider.minimax.baseUrlDescription", language),
        required: true,
      },
      {
        key: "modelName",
        label: t("provider.minimax.modelName", language),
        type: "text",
        placeholder: t("provider.minimax.modelNamePlaceholder", language),
        description: t("provider.minimax.modelNameDescription", language),
      },
    ];
  }
}
