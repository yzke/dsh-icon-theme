# dsh-icon-theme

为 DeepSeek Harness 的设置导航和侧边栏功能自动分配、统一并允许手动更改图标。

## 能做什么

- 从 `settings.section` 与 `sidebar.footer.action` 插槽账本实时发现当前功能。
- 以稳定 ID 保存选择，切换中英文、排序或重载界面不会丢失映射。
- 默认保留 DSH 和插件已有的专用图标，只替换设置页里重复出现的通用齿轮。
- 内置 50 个 Fluent UI 16 Regular 图标，以及经过审核的 dsh-market 原图标。
- 每个目标都显示来源：手动、插件自带、预设、自动推断、原图标或安全回退。
- 完全离线；运行时不请求 Iconify、CDN、GitHub 或任意远程 SVG。
- 卸载或热重载时恢复宿主原始 SVG，不留下 DOM 标记。

## 兼容性

首版面向 DSH `>=0.1.0-rc.6 <0.2.0`。DSH 0.1.x 的
`settings.section` 只公开 `id`、`order`、`label`，设置壳层内部才决定图标，
因此插件使用一个严格、可逆、遇到结构不一致就停止工作的兼容层。它不依赖
CSS Modules 哈希类名，也不把本地化文字当作持久化 ID。

设置页功能可以完整识别。侧边栏只处理 `sidebar.footer.action` 中拥有单一根节点、
且按钮直接包含 SVG 的项目；余额卡片等非图标行会明确跳过。

## 开发期安装

```bash
npm install
npm run qa
dsh plugin --profile web add link:/absolute/path/to/dsh-icon-theme
```

安装后重启 `dsh web`，打开“设置 → 图标”。正式发布到 npm 后可改用：

```bash
dsh plugin --profile web add dsh-icon-theme
```

## 默认映射

| 功能 ID | 默认行为 |
| --- | --- |
| `general`、`models`、`plugins`、`agent-presets` | 保留 DSH 原生图标 |
| `market` | dsh-market 自带九宫格图标 |
| `dsh-mneme` | 记忆 / Brain |
| `cost-meter` | 钱包 / Wallet |
| `dsh-mineru` | PDF 文档 |
| `at-file` | 文件提及 |
| `notification` | 通知铃 |
| `better-sidebar` | 优先保留插件自己的图标；没有时用侧边卡片 |
| `chat-import`、`usage-stats`、`bookmarks` | 优先保留侧边栏已渲染的插件图标 |

完整架构、热门插件抽样和取舍见 [docs/design.md](docs/design.md)，测试分层见
[TESTING.md](TESTING.md)。

## 隐私与安全

自动识别只读取 DSH 已公开的插槽元数据和当前页面结构。插件不会扫描用户文件，
不会解析其他插件的编译产物，也不会从 README、favicon 或任意远程地址猜测图标。
自带图标只有在来源、许可证和 16 px 单色适配均审核通过后才进入精确适配表。
