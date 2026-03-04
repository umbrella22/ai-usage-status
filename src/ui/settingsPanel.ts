/**
 * Settings Panel (WebView)
 *
 * Dynamic settings UI that renders configuration cards for each provider.
 * Adapts automatically to registered providers.
 */

import * as vscode from "vscode";
import type { AIProvider, ProviderConfigField, Language } from "../types";
import { getLanguage, t } from "./i18n";

/**
 * Show the settings WebView panel.
 */
export async function showSettingsPanel(
  context: vscode.ExtensionContext,
  providers: AIProvider[],
  onSave: () => void,
): Promise<vscode.WebviewPanel> {
  const language = getLanguage();

  const panel = vscode.window.createWebviewPanel(
    "aiUsageSettings",
    t("settingsTitle", language),
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  // Build provider config data for webview
  const providersData = providers.map((p) => ({
    id: p.meta.id,
    name: p.meta.name,
    description: p.meta.description,
    enabled: vscode.workspace
      .getConfiguration(`aiUsageStatus.${p.meta.id}`)
      .get<boolean>("enabled", false),
    fields: p.meta.configFields.map((field) => ({
      ...field,
      value: getCurrentValue(p.meta.id, field),
    })),
  }));

  const globalConfig = vscode.workspace.getConfiguration("aiUsageStatus");
  const refreshInterval = globalConfig.get<number>("refreshInterval", 60);

  panel.webview.html = buildSettingsHtml(
    providersData,
    refreshInterval,
    language,
  );

  // Handle messages from webview
  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === "saveSettings") {
        await saveSettings(message.data, language);
        panel.dispose();
        onSave();
        const msg = language === "en-US" ? "Settings saved!" : "配置保存成功！";
        vscode.window.showInformationMessage(msg);
      } else if (message.command === "cancelSettings") {
        panel.dispose();
      }
    },
    undefined,
    context.subscriptions,
  );

  return panel;
}

// ─── Internal Helpers ───────────────────────────────────────────────

function getCurrentValue(
  providerId: string,
  field: ProviderConfigField,
): string | number | boolean {
  const config = vscode.workspace.getConfiguration(
    `aiUsageStatus.${providerId}`,
  );
  return config.get(field.key, field.defaultValue ?? "");
}

async function saveSettings(
  data: Record<string, unknown>,
  language: Language,
): Promise<void> {
  // Save global settings
  const globalConfig = vscode.workspace.getConfiguration("aiUsageStatus");
  if (data.refreshInterval !== undefined) {
    await globalConfig.update(
      "refreshInterval",
      data.refreshInterval,
      vscode.ConfigurationTarget.Global,
    );
  }
  if (data.language !== undefined) {
    await globalConfig.update(
      "language",
      data.language,
      vscode.ConfigurationTarget.Global,
    );
  }

  // Save per-provider settings
  const providers = data.providers as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (providers) {
    for (const [providerId, providerData] of Object.entries(providers)) {
      const config = vscode.workspace.getConfiguration(
        `aiUsageStatus.${providerId}`,
      );
      for (const [key, value] of Object.entries(providerData)) {
        await config.update(key, value, vscode.ConfigurationTarget.Global);
      }
    }
  }
}

interface ProviderViewData {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  fields: (ProviderConfigField & { value: string | number | boolean })[];
}

function buildSettingsHtml(
  providers: ProviderViewData[],
  refreshInterval: number,
  language: Language,
): string {
  const providerCards = providers
    .map((p) => buildProviderCard(p, language))
    .join("\n");
  const langSelect =
    language === "zh-CN"
      ? '<option value="zh-CN" selected>中文</option><option value="en-US">English</option>'
      : '<option value="zh-CN">中文</option><option value="en-US" selected>English</option>';

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t("settingsTitle", language)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 20px;
      padding: 0;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .container { max-width: 640px; margin: 0 auto; }
    h1 {
      color: var(--vscode-editor-foreground);
      border-bottom: 2px solid var(--vscode-panel-border);
      padding-bottom: 10px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }
    .card h2 {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: var(--vscode-editorForeground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-description {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 12px;
    }
    .form-group { margin-bottom: 16px; }
    .form-group:last-child { margin-bottom: 0; }
    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: var(--vscode-editor-foreground);
      font-size: 13px;
    }
    input[type="text"],
    input[type="password"],
    input[type="number"],
    select {
      padding: 10px 14px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 14px;
      width: 100%;
      box-sizing: border-box;
    }
    input[type="number"] { width: 120px; }
    select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23c5c5c5' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 36px;
    }
    .checkbox-group {
      display: flex; align-items: center; gap: 8px;
    }
    .checkbox-group label { margin-bottom: 0; font-weight: 400; }
    .info-text {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: var(--vscode-input-border);
      border-radius: 20px;
      transition: .3s;
    }
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: var(--vscode-editor-foreground);
      border-radius: 50%;
      transition: .3s;
    }
    .toggle-switch input:checked + .toggle-slider {
      background-color: var(--vscode-button-background);
    }
    .toggle-switch input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }
    .provider-fields { transition: opacity 0.3s; }
    .provider-fields.disabled { opacity: 0.4; pointer-events: none; }
    .button-group { display: flex; gap: 12px; margin-top: 8px; }
    button {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    button:hover { background-color: var(--vscode-button-hoverBackground); }
    button.secondary {
      background-color: transparent;
      border: 1px solid var(--vscode-button-secondaryBackground);
    }
    button.secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${t("settingsTitle", language)}</h1>

    <!-- General Settings -->
    <div class="card">
      <h2>${t("generalSettings", language)}</h2>
      <div class="form-group">
        <label for="refreshInterval">${t("refreshInterval", language)}</label>
        <input type="number" id="refreshInterval" min="5" max="300" value="${refreshInterval}">
        <div class="info-text">${t("refreshIntervalInfo", language)}</div>
      </div>
      <div class="form-group">
        <label for="language">Language / 语言</label>
        <select id="language">
          ${langSelect}
        </select>
      </div>
    </div>

    <!-- Provider Cards -->
    ${providerCards}

    <div class="button-group">
      <button id="saveBtn">${t("save", language)}</button>
      <button id="cancelBtn" class="secondary">${t("cancel", language)}</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Toggle provider fields visibility
    document.querySelectorAll('.provider-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const providerId = e.target.dataset.provider;
        const fields = document.getElementById('fields-' + providerId);
        if (fields) {
          fields.classList.toggle('disabled', !e.target.checked);
        }
      });
    });

    // Save
    document.getElementById('saveBtn').addEventListener('click', () => {
      const data = {
        refreshInterval: parseInt(document.getElementById('refreshInterval').value, 10),
        language: document.getElementById('language').value,
        providers: {},
      };

      // Collect provider data
      document.querySelectorAll('.provider-card').forEach(card => {
        const providerId = card.dataset.provider;
        const providerData = {};

        // Enabled toggle
        const toggle = card.querySelector('.provider-toggle');
        if (toggle) providerData.enabled = toggle.checked;

        // All fields
        card.querySelectorAll('[data-field]').forEach(el => {
          const key = el.dataset.field;
          if (el.type === 'checkbox') {
            providerData[key] = el.checked;
          } else if (el.type === 'number') {
            providerData[key] = parseInt(el.value, 10);
          } else {
            providerData[key] = el.value.trim();
          }
        });

        data.providers[providerId] = providerData;
      });

      vscode.postMessage({ command: 'saveSettings', data });
    });

    // Cancel
    document.getElementById('cancelBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'cancelSettings' });
    });
  </script>
</body>
</html>`;
}

function buildProviderCard(
  provider: ProviderViewData,
  language: Language,
): string {
  const fieldsHtml = provider.fields
    .map((f) => buildFieldHtml(provider.id, f))
    .join("\n");
  const enabledLabel = provider.enabled
    ? t("enabled", language)
    : t("disabled", language);

  return `
    <div class="card provider-card" data-provider="${provider.id}">
      <h2>
        <span>${provider.name}</span>
        <label class="toggle-switch">
          <input type="checkbox" class="provider-toggle" data-provider="${provider.id}" ${provider.enabled ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </label>
      </h2>
      <div class="card-description">${provider.description}</div>
      <div id="fields-${provider.id}" class="provider-fields ${provider.enabled ? "" : "disabled"}">
        ${fieldsHtml}
      </div>
    </div>`;
}

function buildFieldHtml(
  providerId: string,
  field: ProviderConfigField & { value: string | number | boolean },
): string {
  const id = `${providerId}_${field.key}`;
  const desc = field.description
    ? `<div class="info-text">${field.description}</div>`
    : "";

  switch (field.type) {
    case "text":
    case "password":
      return `
        <div class="form-group">
          <label for="${id}">${field.label}</label>
          <input type="${field.type}" id="${id}" data-field="${field.key}"
            placeholder="${field.placeholder || ""}" value="${escapeHtml(String(field.value || ""))}">
          ${desc}
        </div>`;

    case "number":
      return `
        <div class="form-group">
          <label for="${id}">${field.label}</label>
          <input type="number" id="${id}" data-field="${field.key}" value="${field.value || 0}">
          ${desc}
        </div>`;

    case "select": {
      const options = (field.options || [])
        .map(
          (o) =>
            `<option value="${o.value}" ${o.value === String(field.value) ? "selected" : ""}>${o.label}</option>`,
        )
        .join("");
      return `
        <div class="form-group">
          <label for="${id}">${field.label}</label>
          <select id="${id}" data-field="${field.key}">
            ${options}
          </select>
          ${desc}
        </div>`;
    }

    case "boolean":
      return `
        <div class="form-group">
          <div class="checkbox-group">
            <input type="checkbox" id="${id}" data-field="${field.key}" ${field.value ? "checked" : ""}>
            <label for="${id}">${field.label}</label>
          </div>
          ${desc}
        </div>`;

    default:
      return "";
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
