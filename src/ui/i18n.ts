/**
 * Internationalization (i18n) Module
 *
 * Centralized string translations for all UI elements.
 */

import * as vscode from "vscode";
import type { I18nStrings, Language } from "../types";

export interface OnboardingCopy {
  title: string;
  subtitle: string;
  autoRefreshTitle: string;
  autoRefreshBody: string;
  configureTitle: string;
  configureBody: string;
  useTitle: string;
  useBody: string;
  providersTitle: string;
  providersBody: string;
  ctaPrimary: string;
  ctaSecondary: string;
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;
  stepLabel: string;
}

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
    aiProviders: "AI 供应商",
    settingsSaved: "配置保存成功！",
    activationFailed: "AI Usage Status 扩展激活失败",
    period: "时间段",
    usageAmount: "用量",
    setupCommandTitle: "打开 AI Usage Status 设置",
    noUsageData: "没有可用的使用数据",
    usageSummary: "使用情况",
    "onboarding.title": "欢迎使用 AI Usage Status",
    "onboarding.subtitle":
      "这个扩展会在 VS Code 底部状态栏展示 AI 供应商的额度和使用率，适合随时查看套餐消耗。",
    "onboarding.autoRefreshTitle": "它会做什么",
    "onboarding.autoRefreshBody":
      "自动刷新各个 AI 平台的用量，并在状态栏和悬浮详情中显示额度、统计信息和到期时间。",
    "onboarding.configureTitle": "如何配置",
    "onboarding.configureBody":
      "先打开配置向导，启用你需要的供应商，再填入对应的 API Key、Token、Group ID 或平台地址。",
    "onboarding.useTitle": "如何使用",
    "onboarding.useBody":
      "保存后，底部状态栏会显示每个已启用供应商的用量。点击状态栏可回到对应供应商设置，悬停可查看详细数据。",
    "onboarding.providersTitle": "当前支持",
    "onboarding.providersBody": "MiniMax（国内/海外）以及 智谱 / ZAI。",
    "onboarding.ctaPrimary": "打开配置向导",
    "onboarding.ctaSecondary": "稍后再说",
    "onboarding.step1Title": "1. 启用供应商",
    "onboarding.step1Body":
      "在设置页打开你要监控的平台，比如 MiniMax 或 智谱 / ZAI。",
    "onboarding.step2Title": "2. 填写凭据",
    "onboarding.step2Body":
      "根据平台要求填写 API Key、Auth Token、Group ID 和平台地址。",
    "onboarding.step3Title": "3. 查看状态栏",
    "onboarding.step3Body":
      "保存后即可在底部状态栏看到用量百分比，颜色会随额度变化。",
    "onboarding.stepLabel": "步骤",

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
    "provider.minimax.description": "MiniMax AI 用量查询（支持国内/海外）",
    "provider.minimax.token": "API Key",
    "provider.minimax.tokenPlaceholder": "请输入 API Key",
    "provider.minimax.tokenDescription": "MiniMax 平台的 API Key",
    "provider.minimax.groupId": "Group ID",
    "provider.minimax.groupIdPlaceholder": "请输入 Group ID",
    "provider.minimax.groupIdDescription": "MiniMax 账号的 Group ID",
    "provider.minimax.baseUrl": "平台地址",
    "provider.minimax.baseUrlDescription": "选择国内或海外平台",
    "provider.minimax.baseUrlDomestic": "国内 (minimaxi.com)",
    "provider.minimax.baseUrlOverseas": "海外 (minimax.io)",
    "provider.minimax.modelName": "模型选择",
    "provider.minimax.modelNamePlaceholder": "留空自动选择第一个模型",
    "provider.minimax.modelNameDescription": "选择要显示的模型名称",
    "provider.minimax.configError":
      "请在设置中配置 MiniMax API Key 和 Group ID",
    "provider.minimax.codingPlan": "Coding Plan",
    "minimax.domestic": "国内",
    "minimax.overseas": "海外",

    // ZAI / 智谱 specific
    "provider.zhipu.name": "智谱",
    "provider.zhipu.description": "智谱 AI 用量查询",
    "provider.zhipu.authToken": "认证 Token",
    "provider.zhipu.authTokenPlaceholder": "请输入认证 Token",
    "provider.zhipu.authTokenDescription": "智谱认证 Token（必填）",
    "provider.zhipu.baseUrl": "平台地址",
    "provider.zhipu.baseUrlDescription": "选择平台地址",
    "provider.zhipu.baseUrlZhipu": "智谱 (open.bigmodel.cn)",
    "provider.zhipu.modelName": "模型选择",
    "provider.zhipu.modelNamePlaceholder": "留空自动选择",
    "provider.zhipu.modelNameDescription":
      "选择要显示的模型名称（留空则自动从用量数据中获取）",
    "provider.zhipu.configError": "请在设置中配置智谱认证 Token 和平台地址",
    "provider.zhipu.tokenUsage24h": "24h Token 消耗",
    "provider.zhipu.toolUsage24h": "24h 工具调用",
    "provider.zhipu.tokenUsage": "Token 使用",
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
    aiProviders: "AI Providers",
    settingsSaved: "Settings saved!",
    activationFailed: "AI Usage Status extension activation failed",
    period: "Period",
    usageAmount: "Usage",
    setupCommandTitle: "Open AI Usage Status Settings",
    noUsageData: "No usage data available",
    usageSummary: "Usage",
    "onboarding.title": "Welcome to AI Usage Status",
    "onboarding.subtitle":
      "This extension shows AI provider quota and usage directly in the VS Code status bar so you can keep track of plan consumption at a glance.",
    "onboarding.autoRefreshTitle": "What it does",
    "onboarding.autoRefreshBody":
      "It automatically refreshes usage from supported AI platforms and shows quota, stats, and expiry details in the status bar and hover panel.",
    "onboarding.configureTitle": "How to configure",
    "onboarding.configureBody":
      "Open the setup wizard, enable the providers you need, then fill in the required API key, token, group ID, or platform URL.",
    "onboarding.useTitle": "How to use it",
    "onboarding.useBody":
      "After saving, each enabled provider appears in the status bar. Click a status bar item to jump back to that provider's settings, or hover to inspect detailed usage.",
    "onboarding.providersTitle": "Supported providers",
    "onboarding.providersBody": "MiniMax (domestic/overseas) and ZAI / Zhipu.",
    "onboarding.ctaPrimary": "Open Setup Wizard",
    "onboarding.ctaSecondary": "Maybe Later",
    "onboarding.step1Title": "1. Enable a provider",
    "onboarding.step1Body":
      "Turn on the platform you want to monitor, such as MiniMax or ZAI / Zhipu.",
    "onboarding.step2Title": "2. Enter credentials",
    "onboarding.step2Body":
      "Fill in the API key, auth token, group ID, and platform URL required by that provider.",
    "onboarding.step3Title": "3. Watch the status bar",
    "onboarding.step3Body":
      "Once saved, usage percentages appear in the bottom status bar and change color as quota usage increases.",
    "onboarding.stepLabel": "Step",

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
    "provider.minimax.description":
      "MiniMax AI usage query (domestic/overseas)",
    "provider.minimax.token": "API Key",
    "provider.minimax.tokenPlaceholder": "Enter API Key",
    "provider.minimax.tokenDescription": "MiniMax platform API key",
    "provider.minimax.groupId": "Group ID",
    "provider.minimax.groupIdPlaceholder": "Enter Group ID",
    "provider.minimax.groupIdDescription": "MiniMax account Group ID",
    "provider.minimax.baseUrl": "Platform URL",
    "provider.minimax.baseUrlDescription":
      "Select domestic or overseas platform",
    "provider.minimax.baseUrlDomestic": "Domestic (minimaxi.com)",
    "provider.minimax.baseUrlOverseas": "Overseas (minimax.io)",
    "provider.minimax.modelName": "Model",
    "provider.minimax.modelNamePlaceholder":
      "Auto-select the first model if empty",
    "provider.minimax.modelNameDescription": "Choose the model name to display",
    "provider.minimax.configError":
      "Please configure the MiniMax API key and Group ID in settings",
    "provider.minimax.codingPlan": "Coding Plan",
    "minimax.domestic": "Domestic",
    "minimax.overseas": "Overseas",

    // ZAI specific
    "provider.zhipu.name": "ZAI",
    "provider.zhipu.description": "ZAI AI usage query",
    "provider.zhipu.authToken": "Auth Token",
    "provider.zhipu.authTokenPlaceholder": "Enter auth token",
    "provider.zhipu.authTokenDescription": "ZAI auth token (required)",
    "provider.zhipu.baseUrl": "Platform URL",
    "provider.zhipu.baseUrlDescription": "Select platform URL",
    "provider.zhipu.baseUrlZhipu": "ZAI (open.bigmodel.cn)",
    "provider.zhipu.modelName": "Model",
    "provider.zhipu.modelNamePlaceholder": "Auto-select if empty",
    "provider.zhipu.modelNameDescription":
      "Choose the model name to display (auto-detected if empty)",
    "provider.zhipu.configError":
      "Please configure the ZAI auth token and platform URL in settings",
    "provider.zhipu.tokenUsage24h": "24h Token Usage",
    "provider.zhipu.toolUsage24h": "24h Tool Calls",
    "provider.zhipu.tokenUsage": "Token Usage",
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

export function getOnboardingCopy(language?: Language): OnboardingCopy {
  const lang = language ?? getLanguage();

  return {
    title: t("onboarding.title", lang),
    subtitle: t("onboarding.subtitle", lang),
    autoRefreshTitle: t("onboarding.autoRefreshTitle", lang),
    autoRefreshBody: t("onboarding.autoRefreshBody", lang),
    configureTitle: t("onboarding.configureTitle", lang),
    configureBody: t("onboarding.configureBody", lang),
    useTitle: t("onboarding.useTitle", lang),
    useBody: t("onboarding.useBody", lang),
    providersTitle: t("onboarding.providersTitle", lang),
    providersBody: t("onboarding.providersBody", lang),
    ctaPrimary: t("onboarding.ctaPrimary", lang),
    ctaSecondary: t("onboarding.ctaSecondary", lang),
    step1Title: t("onboarding.step1Title", lang),
    step1Body: t("onboarding.step1Body", lang),
    step2Title: t("onboarding.step2Title", lang),
    step2Body: t("onboarding.step2Body", lang),
    step3Title: t("onboarding.step3Title", lang),
    step3Body: t("onboarding.step3Body", lang),
    stepLabel: t("onboarding.stepLabel", lang),
  };
}
