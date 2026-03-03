/**
 * Internationalization (i18n) Module
 *
 * Centralized string translations for all UI elements.
 */

import * as vscode from "vscode";
import type { I18nStrings, Language } from "../types";

const translations: Record<Language, I18nStrings> = {
  "zh-CN": {
    // Status bar
    loading: "加载中...",
    error: "错误",
    needsConfig: "需要配置",
    clickToRefresh: "点击刷新状态",
    clickToConfigure: "点击配置",

    // Settings panel
    settingsTitle: "AI Usage Status 设置",
    save: "保存",
    cancel: "取消",
    enabled: "已启用",
    disabled: "已禁用",
    refreshInterval: "刷新间隔（秒）",
    refreshIntervalInfo: "自动刷新间隔，建议 10-30 秒",
    generalSettings: "通用设置",

    // Usage display
    model: "模型",
    usageProgress: "使用进度",
    remainingTime: "剩余时间",
    timeWindow: "时间窗口",
    yesterday: "昨日消耗",
    last7Days: "近7天消耗",
    totalUsage: "套餐总消耗",
    expiry: "套餐到期",
    tokenStats: "=== Token 消耗统计 ===",

    // MiniMax specific
    "minimax.domestic": "国内",
    "minimax.overseas": "海外",

    // ZHIPU specific
    "zhipu.tokenUsage5h": "Token 用量 (5小时)",
    "zhipu.mcpUsageMonth": "MCP 用量 (月)",
  },
  "en-US": {
    // Status bar
    loading: "Loading...",
    error: "Error",
    needsConfig: "Needs Config",
    clickToRefresh: "Click to refresh",
    clickToConfigure: "Click to configure",

    // Settings panel
    settingsTitle: "AI Usage Status Settings",
    save: "Save",
    cancel: "Cancel",
    enabled: "Enabled",
    disabled: "Disabled",
    refreshInterval: "Refresh Interval (seconds)",
    refreshIntervalInfo: "Auto-refresh interval, 10-30 seconds recommended",
    generalSettings: "General Settings",

    // Usage display
    model: "Model",
    usageProgress: "Usage",
    remainingTime: "Remaining",
    timeWindow: "Time Window",
    yesterday: "Yesterday",
    last7Days: "Last 7 days",
    totalUsage: "Total usage",
    expiry: "Expires",
    tokenStats: "=== Token Usage Stats ===",

    // MiniMax specific
    "minimax.domestic": "Domestic",
    "minimax.overseas": "Overseas",

    // ZHIPU specific
    "zhipu.tokenUsage5h": "Token Usage (5h)",
    "zhipu.mcpUsageMonth": "MCP Usage (Month)",
  },
};

/**
 * Get current language from VS Code settings.
 */
export function getLanguage(): Language {
  const config = vscode.workspace.getConfiguration("aiUsageStatus");
  return config.get<Language>("language", "zh-CN");
}

/**
 * Get translated string by key.
 */
export function t(
  key: keyof I18nStrings | string,
  language?: Language,
): string {
  const lang = language ?? getLanguage();
  const strings = translations[lang] || translations["zh-CN"];
  const resolvedKey = String(key);
  return strings[resolvedKey] || resolvedKey;
}

/**
 * Get all i18n strings for a language.
 */
export function getI18nStrings(language?: Language): I18nStrings {
  const lang = language ?? getLanguage();
  return translations[lang] || translations["zh-CN"];
}
