import * as vscode from "vscode";
import type { Language } from "../types";
import { getOnboardingCopy } from "./i18n";

let currentPanel: vscode.WebviewPanel | undefined;

export function showOnboardingPanel(
  context: vscode.ExtensionContext,
  language: Language,
): vscode.WebviewPanel {
  const copy = getOnboardingCopy(language);

  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    return currentPanel;
  }

  const panel = vscode.window.createWebviewPanel(
    "aiUsageStatusOnboarding",
    copy.title,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "public")],
    },
  );

  const logoUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "public", "icon.png"),
  );

  panel.webview.html = buildOnboardingHtml(language, logoUri.toString());

  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === "openSetup") {
        await vscode.commands.executeCommand("aiUsageStatus.setup");
        panel.dispose();
      } else if (message.command === "dismiss") {
        panel.dispose();
      }
    },
    undefined,
    context.subscriptions,
  );

  panel.onDidDispose(() => {
    if (currentPanel === panel) {
      currentPanel = undefined;
    }
  });

  currentPanel = panel;
  return panel;
}

function buildOnboardingHtml(language: Language, logoSrc: string): string {
  const copy = getOnboardingCopy(language);

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(copy.title)}</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --card-bg: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
      --card-border: var(--vscode-widget-border, var(--vscode-panel-border));
      --desc: var(--vscode-descriptionForeground);
      --accent: var(--vscode-button-background);
      --accent-fg: var(--vscode-button-foreground);
      --accent-hover: var(--vscode-button-hoverBackground);
      --secondary-bg: var(--vscode-button-secondaryBackground);
      --secondary-fg: var(--vscode-button-secondaryForeground);
      --secondary-hover: var(--vscode-button-secondaryHoverBackground);
      --link: var(--vscode-textLink-foreground);
    }
    body {
      margin: 0;
      padding: 40px 20px;
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      line-height: 1.5;
      background-color: var(--bg);
      color: var(--fg);
    }
    .shell {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    
    /* Header Section */
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .logo-icon {
      width: 72px;
      height: 72px;
      margin-bottom: 16px;
      display: inline-block;
      object-fit: contain;
    }
    h1 {
      font-size: 26px;
      font-weight: 500;
      margin: 0 0 12px;
      color: var(--fg);
    }
    .subtitle {
      font-size: 14px;
      color: var(--desc);
      max-width: 600px;
      margin: 0 auto 24px;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    
    /* Buttons */
    button {
      border: none;
      border-radius: 2px;
      padding: 6px 14px;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      min-width: 100px;
    }
    .primary {
      background: var(--accent);
      color: var(--accent-fg);
    }
    .primary:hover { background: var(--accent-hover); }
    .secondary {
      background: var(--secondary-bg);
      color: var(--secondary-fg);
    }
    .secondary:hover { background: var(--secondary-hover); }

    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 4px; /* More VS Code-like */
      padding: 20px;
    }
    
    .card h2 {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--desc);
    }
    
    .card p {
      margin: 0;
      font-size: 13px;
      color: var(--fg);
    }

    /* Steps List */
    .steps-section {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 4px;
      padding: 24px;
    }
    .steps-section h2 {
      margin-top: 0;
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-settings-dropdownBorder, var(--card-border));
    }
    
    .steps-list {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .step-item {
      position: relative;
    }
    .step-number {
      font-size: 12px;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .step-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--fg);
    }
    .step-body {
      font-size: 13px;
      color: var(--desc);
      line-height: 1.6;
    }

    /* Link Style */
    a {
      color: var(--link);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }

    @media (max-width: 700px) {
      .features-grid, .steps-list {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      body { padding: 24px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="header">
      <img class="logo-icon" src="${logoSrc}" alt="AI Usage Status logo">
      <h1>${escapeHtml(copy.title)}</h1>
      <p class="subtitle">${escapeHtml(copy.subtitle)}</p>
      <div class="actions">
        <button id="openSetup" class="primary">${escapeHtml(copy.ctaPrimary)}</button>
        <button id="dismiss" class="secondary">${escapeHtml(copy.ctaSecondary)}</button>
      </div>
    </header>

    <div class="features-grid">
      <div class="card">
        <h2>${escapeHtml(copy.autoRefreshTitle)}</h2>
        <p>${escapeHtml(copy.autoRefreshBody)}</p>
      </div>
      <div class="card">
        <h2>${escapeHtml(copy.providersTitle)}</h2>
        <p>${escapeHtml(copy.providersBody)}</p>
      </div>
    </div>

    <section class="steps-section">
      <h2>${escapeHtml(copy.configureTitle)}</h2>
      <ol class="steps-list">
        <li class="step-item">
          <div class="step-number">${escapeHtml(copy.stepLabel)} 1</div>
          <div class="step-title">${escapeHtml(copy.step1Title.replace(/^1\.\s*/, ""))}</div>
          <div class="step-body">${escapeHtml(copy.step1Body)}</div>
        </li>
        <li class="step-item">
          <div class="step-number">${escapeHtml(copy.stepLabel)} 2</div>
          <div class="step-title">${escapeHtml(copy.step2Title.replace(/^2\.\s*/, ""))}</div>
          <div class="step-body">${escapeHtml(copy.step2Body)}</div>
        </li>
        <li class="step-item">
          <div class="step-number">${escapeHtml(copy.stepLabel)} 3</div>
          <div class="step-title">${escapeHtml(copy.step3Title.replace(/^3\.\s*/, ""))}</div>
          <div class="step-body">${escapeHtml(copy.step3Body)}</div>
        </li>
      </ol>
      <p style="margin-top: 20px; color: var(--desc); font-size: 13px;">${escapeHtml(copy.configureBody)}</p>
    </section>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('openSetup').addEventListener('click', () => {
      vscode.postMessage({ command: 'openSetup' });
    });
    document.getElementById('dismiss').addEventListener('click', () => {
      vscode.postMessage({ command: 'dismiss' });
    });
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
