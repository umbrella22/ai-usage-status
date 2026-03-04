# AI Usage Status

在 VS Code 状态栏实时监控多个 AI 供应商的用量状态。

## 功能特性

- **状态栏实时显示** — 在 VS Code 底部状态栏直接查看 AI 用量百分比，颜色随用量自动变化（绿/黄/红）
- **悬浮详情面板** — 鼠标悬停即可查看详细用量信息，包括指标进度条、Token 消耗统计、套餐到期时间等
- **多供应商支持** — 目前支持 MiniMax（国内/海外）和 ZHIPU/ZAI 两个 AI 平台
- **可视化设置面板** — 内置配置向导，无需手动编辑 JSON
- **自动刷新** — 可配置刷新间隔，后台自动更新用量数据
- **双语支持** — 支持中文和英文界面

## 支持的供应商

### MiniMax

- 支持国内（minimaxi.com）和海外（minimax.io）平台
- 显示 Coding Plan 用量、模型信息、剩余时间
- 套餐到期提醒、Token 消耗统计（昨日/近7天/总消耗）

### ZHIPU / ZAI

- 支持 ZAI（api.z.ai）和 ZHIPU（open.bigmodel.cn）平台
- 显示 Token 用量配额、MCP 工具调用配额
- 24 小时 Token 消耗和工具调用统计

## 快速开始

1. 安装插件后，状态栏会出现 **AI: 需要配置** 提示
2. 点击状态栏提示，或运行命令 `AI Usage Status: 配置向导`
3. 在设置面板中启用所需的供应商，填入 API Key 等凭据
4. 保存后即可在状态栏查看用量

## 配置说明

| 设置项                          | 说明                      | 默认值  |
| ------------------------------- | ------------------------- | ------- |
| `aiUsageStatus.refreshInterval` | 自动刷新间隔（秒）        | `60`    |
| `aiUsageStatus.language`        | 界面语言（zh-CN / en-US） | `zh-CN` |

### MiniMax 配置

| 设置项                            | 说明                     |
| --------------------------------- | ------------------------ |
| `aiUsageStatus.minimax.enabled`   | 启用 MiniMax             |
| `aiUsageStatus.minimax.token`     | MiniMax API Key          |
| `aiUsageStatus.minimax.groupId`   | MiniMax Group ID         |
| `aiUsageStatus.minimax.baseUrl`   | 平台地址（国内/海外）    |
| `aiUsageStatus.minimax.modelName` | 模型选择（留空自动选择） |

### ZHIPU 配置

| 设置项                          | 说明                     |
| ------------------------------- | ------------------------ |
| `aiUsageStatus.zhipu.enabled`   | 启用 ZHIPU               |
| `aiUsageStatus.zhipu.authToken` | 认证 Token               |
| `aiUsageStatus.zhipu.baseUrl`   | 平台地址（ZAI/ZHIPU）    |
| `aiUsageStatus.zhipu.modelName` | 模型选择（留空自动获取） |

## 命令

- `AI Usage Status: 配置向导` — 打开可视化设置面板
- `AI Usage Status: 刷新状态` — 手动刷新所有供应商状态
