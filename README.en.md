# AI Usage Status

[中文](README.md) | [English](README.en.md)

Monitor usage status for multiple AI providers directly in the VS Code status bar.

## Features

- **Live status bar display** — Check AI quota usage percentages right from the VS Code status bar, with automatic green/yellow/red color changes
- **Hover detail panel** — Inspect detailed usage information, including progress bars, token stats, and plan expiry
- **Multi-provider support** — Currently supports MiniMax (domestic/overseas) and ZAI / Zhipu
- **Visual settings panel** — Built-in setup wizard, no need to edit JSON manually
- **Auto refresh** — Configurable refresh interval with background updates
- **Bilingual UI** — Supports both Chinese and English

## Supported Providers

### MiniMax

- Supports both domestic (minimaxi.com) and overseas (minimax.io) platforms
- Shows Coding Plan usage, model information, and remaining reset time
- Includes plan expiry reminders and token statistics for yesterday, last 7 days, and current plan total

### ZAI / Zhipu

- Supports both ZAI (api.z.ai) and Zhipu (open.bigmodel.cn)
- Shows token quota usage and MCP tool usage quota
- Includes 24-hour token and tool call statistics

## Quick Start

1. After first install, the extension automatically opens a getting started guide
2. Click the status bar prompt, or run the command `AI Usage Status: Setup Wizard`
3. Enable the providers you want in the settings panel and fill in the required credentials
4. Save the settings and usage information will appear in the status bar

## Configuration

| Setting                         | Description                      | Default |
| ------------------------------- | -------------------------------- | ------- |
| `aiUsageStatus.refreshInterval` | Auto refresh interval in seconds | `60`    |
| `aiUsageStatus.language`        | UI language (`zh-CN` / `en-US`)  | `zh-CN` |

### MiniMax Configuration

| Setting                           | Description                             |
| --------------------------------- | --------------------------------------- |
| `aiUsageStatus.minimax.enabled`   | Enable MiniMax                          |
| `aiUsageStatus.minimax.token`     | MiniMax API Key                         |
| `aiUsageStatus.minimax.groupId`   | MiniMax Group ID                        |
| `aiUsageStatus.minimax.baseUrl`   | Platform URL (domestic / overseas)      |
| `aiUsageStatus.minimax.modelName` | Model to display (auto-select if empty) |

### ZAI / Zhipu Configuration

| Setting                         | Description                             |
| ------------------------------- | --------------------------------------- |
| `aiUsageStatus.zhipu.enabled`   | Enable ZAI / Zhipu                      |
| `aiUsageStatus.zhipu.authToken` | Auth token                              |
| `aiUsageStatus.zhipu.baseUrl`   | Platform URL (ZAI / Zhipu)              |
| `aiUsageStatus.zhipu.modelName` | Model to display (auto-detect if empty) |

## Commands

- `AI Usage Status: Getting Started` — Reopen the first-install guide
- `AI Usage Status: Setup Wizard` — Open the visual settings panel
- `AI Usage Status: Refresh Status` — Refresh all provider statuses manually
