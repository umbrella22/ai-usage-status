/**
 * Settings Panel (WebView)
 *
 * Dynamic settings UI that renders configuration cards for each provider.
 * Adapts automatically to registered providers.
 */

import * as vscode from "vscode";
import type { AIProvider, ProviderConfigField, Language } from "../types";
import { getLanguage, t } from "./i18n";

let currentPanel: vscode.WebviewPanel | undefined;

function resolveSectionTarget(
  providers: AIProvider[],
  providerId?: string,
): string | undefined {
  if (!providerId) {
    return undefined;
  }

  return providers.some((provider) => provider.meta.id === providerId)
    ? `provider-${providerId}`
    : "general-settings";
}

/**
 * Show the settings WebView panel.
 */
export async function showSettingsPanel(
  context: vscode.ExtensionContext,
  providers: AIProvider[],
  onSave: () => void,
  providerId?: string,
): Promise<vscode.WebviewPanel> {
  const language = getLanguage();
  const targetSection = resolveSectionTarget(providers, providerId);

  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    if (targetSection) {
      currentPanel.webview.postMessage({
        command: "selectSection",
        target: targetSection,
      });
    }
    return currentPanel;
  }

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
    targetSection,
  );
  currentPanel = panel;

  panel.onDidDispose(() => {
    if (currentPanel === panel) {
      currentPanel = undefined;
    }
  });

  // Handle messages from webview
  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === "saveSettings") {
        await saveSettings(message.data, language);
        panel.dispose();
        onSave();
        vscode.window.showInformationMessage(t("settingsSaved", language));
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
  initialSection?: string,
): string {
  const providerCards = providers
    .map((p) =>
      buildProviderCard(p, language, {
        hidden: true,
      }),
    )
    .join("\n");
  const providerNavItems = providers
    .map(
      (p) => `
        <button class="nav-item nav-item-child" data-target="provider-${p.id}" data-nav-label="${escapeHtml(cleanDisplayText(p.name))}" data-nav-description="${escapeHtml(cleanDisplayText(p.description))}">
          ${escapeHtml(cleanDisplayText(p.name))}
        </button>`,
    )
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
    :root {
      --settings-header-fg: var(--vscode-settings-headerForeground, var(--vscode-foreground));
      --settings-row-hover: var(--vscode-list-hoverBackground);
      --settings-active-row: var(--vscode-list-activeSelectionBackground);
      --settings-active-fg: var(--vscode-list-activeSelectionForeground);
      --input-bg: var(--vscode-input-background);
      --input-fg: var(--vscode-input-foreground);
      --input-border: var(--vscode-input-border);
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .layout {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      height: 100vh;
      overflow: hidden;
    }
    .sidebar {
      border-right: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBar-background);
      padding: 20px 12px;
      overflow-y: auto;
    }
    .sidebar-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin: 0 0 16px 8px;
    }
    .nav-section { margin-bottom: 16px; }
    .nav-group-title {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      background: transparent;
      border: none;
      cursor: pointer;
    }
    .nav-group-title:hover { color: var(--vscode-foreground); }
    .nav-group-chevron { font-size: 10px; }
    .nav-group-children { display: grid; gap: 2px; margin-top: 4px; }
    .nav-section.collapsed .nav-group-children { display: none; }
    
    .nav-item {
      width: 100%;
      text-align: left;
      background: transparent;
      color: var(--vscode-sideBar-foreground);
      border: none;
      padding: 6px 10px;
      border-radius: 3px;
      font-size: 13px;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .nav-item:hover { background: var(--settings-row-hover); }
    .nav-item.active {
      background: var(--settings-active-row);
      color: var(--settings-active-fg);
    }
    .nav-item-child { padding-left: 22px; }

    /* Main Content */
    .container {
      overflow-y: auto;
      padding: 20px 40px 40px;
    }
    .page-header { margin-bottom: 32px; }
    .page-title {
      font-size: 28px;
      font-weight: 500;
      margin: 0 0 8px;
    }

    .panel-section { display: none; }
    .panel-section.active { display: block; }
    
    /* Settings Items */
    .setting-item {
      margin-bottom: 24px;
      max-width: 800px;
    }
    .setting-header {
      margin-bottom: 6px;
    }
    .setting-title {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      margin-bottom: 4px;
      color: var(--settings-header-fg);
    }
    .setting-description {
      font-size: 13px;
      line-height: 1.5;
      color: var(--vscode-descriptionForeground);
      opacity: 0.9;
    }
    
    .setting-control {
      margin-top: 8px;
    }
    
    /* Inputs */
    input[type="text"],
    input[type="password"],
    input[type="number"],
    select {
      background-color: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      padding: 6px 8px;
      font-family: inherit;
      font-size: 13px;
      border-radius: 2px;
      width: 100%;
      max-width: 400px;
      box-sizing: border-box;
      outline: none;
    }
    input:focus, select:focus {
      border-color: var(--vscode-focusBorder);
    }
    input[type="number"] { width: 120px; }
    
    /* Checkbox layout */
    .setting-checkbox {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .setting-checkbox input[type="checkbox"] {
      margin: 3px 0 0;
    }
    .setting-checkbox .setting-description {
      margin: 0;
    }

    /* Provider Header */
    .provider-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
      flex-shrink: 0;
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

    .provider-fields { opacity: 1; transition: opacity 0.2s; }
    .provider-fields.disabled { opacity: 0.5; pointer-events: none; }

    .button-group {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--vscode-panel-border);
      display: flex;
      gap: 10px;
    }
    button.primary {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 14px;
      border-radius: 2px;
      cursor: pointer;
    }
    button.primary:hover { background-color: var(--vscode-button-hoverBackground); }
    button.secondary {
      background: transparent;
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-button-secondaryBackground);
      padding: 6px 14px;
      border-radius: 2px;
      cursor: pointer;
    }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }

    @media (max-width: 700px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { 
        border-right: none; 
        border-bottom: 1px solid var(--vscode-panel-border); 
        height: 150px;
        padding: 16px; 
      }
      .container { 
        height: auto; 
        overflow: visible; 
        padding: 24px 20px; 
      }
      /* 竖版布局下，让输入框占满宽度，方便操作 */
      input[type="text"],
      input[type="password"],
      input[type="number"],
      select {
        max-width: 100%;
      }
      .setting-item {
        margin-bottom: 28px;
      }
      .button-group {
        flex-direction: column;
      }
      .button-group button {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-title">${escapeHtml(cleanDisplayText(t("settingsTitle", language)))}</div>
      <div class="nav-section">
        <button class="nav-item active" data-target="general-settings">${escapeHtml(cleanDisplayText(t("generalSettings", language)))}</button>
      </div>
      <div class="nav-section" data-collapsible-group>
        <button class="nav-group-title" type="button" data-group-toggle aria-expanded="true">
          <span>${escapeHtml(cleanDisplayText(t("aiProviders", language)))}</span>
          <span class="nav-group-chevron">▾</span>
        </button>
        <div class="nav-group-children">
          ${providerNavItems}
        </div>
      </div>
    </aside>

    <main class="container">
      <div class="page-header">
        <h1 id="pageTitle" class="page-title">${escapeHtml(cleanDisplayText(t("generalSettings", language)))}</h1>
      </div>

      <section id="section-general-settings" class="panel-section active">
        <div class="setting-item">
            <div class="setting-header">
                <div class="setting-title">${escapeHtml(cleanDisplayText(t("refreshInterval", language)))}</div>
                <div class="setting-description">${escapeHtml(cleanDisplayText(t("refreshIntervalInfo", language)))}</div>
            </div>
            <div class="setting-control">
                <input type="number" id="refreshInterval" min="5" max="300" value="${refreshInterval}">
            </div>
        </div>
        
        <div class="setting-item">
            <div class="setting-header">
                <div class="setting-title">Language / 语言</div>
                <div class="setting-description">Interface language / 界面语言</div>
            </div>
            <div class="setting-control">
                <select id="language">${langSelect}</select>
            </div>
        </div>
      </section>

      ${providerCards}

      <div class="button-group">
        <button id="saveBtn" class="primary">${escapeHtml(cleanDisplayText(t("save", language)))}</button>
        <button id="cancelBtn" class="secondary">${escapeHtml(cleanDisplayText(t("cancel", language)))}</button>
      </div>
    </main>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const navItems = Array.from(document.querySelectorAll('.nav-item'));
    const sections = Array.from(document.querySelectorAll('.panel-section'));
    const groupToggles = Array.from(document.querySelectorAll('[data-group-toggle]'));
    const pageTitle = document.getElementById('pageTitle');
    const generalTitle = ${JSON.stringify(cleanDisplayText(t("generalSettings", language)))};
    const initialSection = ${JSON.stringify(initialSection || "general-settings")};

    function activateSection(target) {
      const resolvedTarget = sections.some(section => section.id === 'section-' + target)
        ? target
        : 'general-settings';

      navItems.forEach(item => item.classList.toggle('active', item.dataset.target === resolvedTarget));
      sections.forEach(section => section.classList.toggle('active', section.id === 'section-' + resolvedTarget));
      const activeNav = navItems.find(item => item.dataset.target === resolvedTarget);
      if (pageTitle) pageTitle.textContent = activeNav?.dataset.navLabel || generalTitle;

      if (resolvedTarget.startsWith('provider-')) {
        const providerGroup = document.querySelector('[data-collapsible-group]');
        const providerToggle = providerGroup?.querySelector('[data-group-toggle]');
        if (providerGroup && providerGroup.classList.contains('collapsed')) {
          providerGroup.classList.remove('collapsed');
          providerToggle?.setAttribute('aria-expanded', 'true');
        }
      }
    }

    navItems.forEach(item => {
      item.addEventListener('click', () => activateSection(item.dataset.target));
    });

    groupToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const section = toggle.closest('[data-collapsible-group]');
        if (section) {
          const collapsed = section.classList.toggle('collapsed');
          toggle.setAttribute('aria-expanded', String(!collapsed));
        }
      });
    });

    document.querySelectorAll('.provider-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const providerId = e.target.dataset.provider;
        const fields = document.getElementById('fields-' + providerId);
        if (fields) fields.classList.toggle('disabled', !e.target.checked);
      });
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
      const data = {
        refreshInterval: parseInt(document.getElementById('refreshInterval').value, 10),
        language: document.getElementById('language').value,
        providers: {},
      };

      document.querySelectorAll('.provider-card').forEach(card => {
        const providerId = card.dataset.provider;
        const providerData = {};
        const toggle = card.querySelector('.provider-toggle');
        if (toggle) providerData.enabled = toggle.checked;

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

    document.getElementById('cancelBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'cancelSettings' });
    });

    window.addEventListener('message', event => {
      const message = event.data;
      if (message?.command === 'selectSection' && typeof message.target === 'string') {
        activateSection(message.target);
      }
    });

    activateSection(initialSection);
  </script>
</body>
</html>`;
}

function buildProviderCard(
  provider: ProviderViewData,
  language: Language,
  options: { hidden?: boolean } = {},
): string {
  const fieldsHtml = provider.fields
    .map((f) => buildFieldHtml(provider.id, f))
    .join("\n");

  return `
    <section id="section-provider-${provider.id}" class="panel-section ${options.hidden ? "" : "active"}">
    <div class="provider-card" data-provider="${provider.id}">
      <div class="provider-header">
        <div>
          <div class="setting-title" style="font-size: 16px;">${escapeHtml(cleanDisplayText(provider.name))}</div>
          <div class="setting-description">${escapeHtml(cleanDisplayText(provider.description))}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" class="provider-toggle" data-provider="${provider.id}" ${provider.enabled ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div id="fields-${provider.id}" class="provider-fields ${provider.enabled ? "" : "disabled"}">
        ${fieldsHtml}
      </div>
    </div>
    </section>`;
}

function buildFieldHtml(
  providerId: string,
  field: ProviderConfigField & { value: string | number | boolean },
): string {
  const id = `${providerId}_${field.key}`;
  const label = escapeHtml(cleanDisplayText(field.label));
  const description = field.description
    ? escapeHtml(cleanDisplayText(field.description))
    : "";
  const placeholder = field.placeholder
    ? escapeHtml(cleanDisplayText(field.placeholder))
    : "";

  // Container
  let html = `<div class="setting-item">`;

  // For boolean, layout is Title > Checkbox + Description
  if (field.type === "boolean") {
    html += `
      <div class="setting-header">
        <div class="setting-title">${label}</div>
      </div>
      <div class="setting-control setting-checkbox">
        <input type="checkbox" id="${id}" data-field="${field.key}" ${field.value ? "checked" : ""}>
        <label for="${id}" class="setting-description">${description || label}</label>
      </div>`;
  } else {
    // For others, layout is Title > Description > Control
    html += `
      <div class="setting-header">
        <div class="setting-title">${label}</div>
        ${description ? `<div class="setting-description">${description}</div>` : ""}
      </div>
      <div class="setting-control">`;

    if (field.type === "select") {
      const options = (field.options || [])
        .map(
          (o) =>
            `<option value="${escapeHtml(o.value)}" ${o.value === String(field.value) ? "selected" : ""}>${escapeHtml(cleanDisplayText(o.label))}</option>`,
        )
        .join("");
      html += `<select id="${id}" data-field="${field.key}">${options}</select>`;
    } else {
      const type = field.type === "number" ? "number" : field.type;
      html += `<input type="${type}" id="${id}" data-field="${field.key}" 
                value="${escapeHtml(String(field.value || ""))}" 
                placeholder="${placeholder}">`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanDisplayText(value: string): string {
  return value
    .replace(/\\n/g, " ")
    .replace(/\/n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
