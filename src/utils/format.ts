/**
 * Format utilities - Number formatting, date formatting
 */

import type { Language } from "../types";

/**
 * Format large numbers with units (万/亿 for Chinese, K/M for English)
 */
export function formatNumber(
  num: number,
  language: Language = "zh-CN",
): string {
  if (language === "en-US") {
    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
    }
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 10_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toLocaleString("en-US");
  }

  // Chinese format
  if (num >= 100_000_000) {
    return (num / 100_000_000).toFixed(1).replace(/\.0$/, "") + "亿";
  }
  if (num >= 10_000) {
    return (num / 10_000).toFixed(1).replace(/\.0$/, "") + "万";
  }
  return num.toLocaleString("zh-CN");
}

/**
 * Format a percentage to a fixed-width display string
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format date to localized string
 */
export function formatDate(date: Date, language: Language = "zh-CN"): string {
  return date.toLocaleDateString(language === "zh-CN" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Format time to localized string (HH:mm)
 */
export function formatTime(date: Date, timezone = "Asia/Shanghai"): string {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    hour12: false,
  });
}

/**
 * Format date range to "yyyy-MM-dd HH:mm:ss" (used by ZAI/智谱 API)
 */
export function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

/**
 * Translate remaining time text based on language
 */
export function translateRemainingTime(
  text: string,
  language: Language,
): string {
  if (language === "en-US") {
    return text
      .replace(/小时/, "h")
      .replace(/分钟/, "min")
      .replace(/后重置/, " until reset");
  }
  return text;
}

/**
 * Translate expiry text based on language
 */
export function translateExpiryText(text: string, language: Language): string {
  if (language === "en-US") {
    return text
      .replace(/还剩 (\d+) 天/, "$1 days remaining")
      .replace(/今天到期/, "expires today")
      .replace(/已过期 (\d+) 天/, "expired $1 days ago");
  }
  return text;
}
