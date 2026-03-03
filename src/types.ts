/**
 * AI Usage Status - Type Definitions
 *
 * Unified types for multi-provider AI usage monitoring.
 */

import type * as vscode from "vscode";

// ─── Provider Usage Data (Unified Format) ───────────────────────────

/** Represents a single usage metric from any provider */
export interface UsageMetric {
  /** Metric label, e.g. "Token Usage", "MCP Usage" */
  label: string;
  /** Amount used */
  used: number;
  /** Total quota */
  total: number;
  /** Usage percentage (0-100) */
  percentage: number;
  /** Optional unit, e.g. "tokens", "requests" */
  unit?: string;
}

/** Time window information */
export interface TimeWindow {
  start: string;
  end: string;
  timezone?: string;
}

/** Subscription / plan expiry info */
export interface ExpiryInfo {
  date: string;
  daysRemaining: number;
  text: string;
}

/** Usage statistics over different time ranges */
export interface UsageStats {
  /** Yesterday's usage */
  lastDayUsage: number;
  /** Last 7 days usage */
  weeklyUsage: number;
  /** Total usage in current plan period */
  planTotalUsage: number;
}

/** Unified usage data returned by every provider */
export interface ProviderUsageData {
  /** Provider identifier */
  providerId: string;
  /** Provider display name */
  providerName: string;
  /** Optional sub-label (e.g. "国内", "海外") */
  subLabel?: string;
  /** Primary usage metric (shown in status bar) */
  primaryUsage: UsageMetric;
  /** All usage metrics */
  metrics: UsageMetric[];
  /** Model name or plan name */
  modelName?: string;
  /** List of available models */
  availableModels?: string[];
  /** Time window for current usage period */
  timeWindow?: TimeWindow;
  /** Remaining time until reset */
  remainingTime?: string;
  /** Plan/subscription expiry */
  expiry?: ExpiryInfo;
  /** Detailed usage statistics */
  usageStats?: UsageStats;
  /** Raw provider-specific data for advanced display */
  raw?: unknown;
}

// ─── Provider Interface ─────────────────────────────────────────────

/** Configuration schema for a provider's settings panel */
export interface ProviderConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "select" | "boolean";
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  defaultValue?: string | number | boolean;
}

/** Provider metadata for registration */
export interface ProviderMeta {
  id: string;
  name: string;
  description: string;
  configFields: ProviderConfigField[];
}

/** Abstract AI provider interface */
export interface AIProvider {
  /** Provider metadata */
  readonly meta: ProviderMeta;

  /** Whether the provider has valid configuration */
  isConfigured(): boolean;

  /** Reload configuration from VS Code settings */
  loadConfig(): void;

  /**
   * Fetch usage data from the provider's API.
   * May return multiple ProviderUsageData entries (e.g. domestic + overseas).
   */
  fetchUsage(): Promise<ProviderUsageData[]>;

  /** Dispose any resources (timers, connections, etc.) */
  dispose(): void;
}

// ─── Provider Factory ───────────────────────────────────────────────

/** Factory function to create a provider instance */
export type ProviderFactory = (context: vscode.ExtensionContext) => AIProvider;

// ─── Cache ──────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ─── i18n ───────────────────────────────────────────────────────────

export type Language = "zh-CN" | "en-US";

export interface I18nStrings {
  // Status bar
  loading: string;
  error: string;
  needsConfig: string;
  clickToRefresh: string;
  clickToConfigure: string;

  // Settings panel
  settingsTitle: string;
  save: string;
  cancel: string;
  enabled: string;
  disabled: string;
  refreshInterval: string;
  refreshIntervalInfo: string;
  generalSettings: string;

  // Usage display
  model: string;
  usageProgress: string;
  remainingTime: string;
  timeWindow: string;
  yesterday: string;
  last7Days: string;
  totalUsage: string;
  expiry: string;
  tokenStats: string;

  // Provider-specific (dynamic)
  [key: string]: string;
}
