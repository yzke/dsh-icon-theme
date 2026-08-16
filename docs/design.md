# dsh-icon-theme 调研与设计

更新日期：2026-08-17

## 结论

`dsh-icon-theme` 是合适的包名：它准确表达“为 DSH 提供可切换、可覆盖的图标呈现层”，
比 `dsh-icon` 更不容易被误解为单个图标组件。调研时 npm 上的
`dsh-icon-theme` 与 `dsh-icons` 均未被占用；项目采用前者，界面名称保持简洁的
“图标 / Icons”，内部把可选集合称为 icon pack。

首版技术路线是：保留 DSH 已有原生图标；缺口使用
[Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons) 的
16 px Regular SVG；只打包经过筛选的 50 个图标；不使用运行时 Iconify API、
webfont 或远程 URL。

## DSH 扩展边界

DSH 的设置设计强调“基础包声明插槽，设置壳层负责投影，功能插件拥有自己的页面与
文案”。官方 `settings.section` 契约当前只投影 `id`、`order`、`label`，可见于
[settings slot contract](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-settings/src/client/contract/slots.ts)。
设置壳层只为 `models`、`agent-presets`、`plugins` 三个内置 ID 选择专用图标，
其余 ID 回退到齿轮。这正是当前市场、通知、文件提及、费用等页面看起来都一样的原因。

理想的上游接口不是允许每个图标插件接管整个 `sidebar.settings` 单槽，而是新增一个
按 `{ surface, id }` 解析的呈现链，例如 `settings.section.icon`。在这个接口进入
DSH 之前，首版兼容层遵守以下约束：

1. 身份只来自插槽账本的稳定 ID；标签只用于显示。
2. 设置导航在 DOM 与账本数量或结构不一致时整面停止；侧边栏先尝试完整顺序映射，
   数量不一致时只接受唯一、经过源码审核的语义 class / data 指纹，其余目标不猜测。
3. 不删除宿主 SVG，只插入拥有明确 data 属性的 mask glyph。
4. 插件卸载、HMR 或页面重绘后，所有自有节点和属性都可恢复。
5. 不依赖 CSS Modules 生成的哈希类名；少量侧边栏指纹必须是插件源码持有的稳定语义名，
   并各自有未渲染、非图标、歧义和卸载恢复测试。

社区已有相同需求的证据：`DSH-better-sidebar` 在 0.1.x 中通过
`MutationObserver` 找到自己的本地化设置行、加 data 标记，再用 CSS mask 隐藏齿轮。
它的做法证明兼容层可行，也暴露了按标签匹配和全 body 观察的脆弱性。本项目改为由
稳定账本 ID 与顺序驱动，并集中在两个可测试适配器中。

## 热门开源插件抽样

Star 数为 2026-08-17 调研时 GitHub 返回值，只用于选择有代表性的适配样本，
不参与运行时解析。

| 项目 | Star | 小尺寸图标现状 | 自动使用策略 |
| --- | ---: | --- | --- |
| [modlens](https://github.com/liustack/modlens) | 2351 | 有 banner、流程图、social preview，没有声明式 16 px 插件图标 | 不从宣传图裁剪；有设置目标时用 Vision 语义预设 |
| [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) | 1617 | 有多枚 16 px 自绘图标，并为设置行实现 Lucide mask 兼容层；无统一 manifest icon | 默认保留它已经渲染的图标；无原图时用 Panel Right Gallery |
| [dsh-market](https://github.com/dsh-market/dsh-market) | 550 | 仓库有 `logo-mono.svg`，页面也内联同一 16 px 九宫格图标；npm `files` 不包含 assets | 作为 MIT 审核适配器随本插件静态打包，精确匹配 `market` |
| [dsh-vision-router](https://github.com/ysr666/dsh-vision-router) | 421 | 有 hero/流程 SVG，但不是 16 px 功能图标 | 不抓 hero；按稳定 ID 映射 Eye |
| [dsh-at-file](https://github.com/omdsh-dev/dsh-at-file) | 264 | 有彩色文件类型图标，没有设置页身份图标 | 使用单色 Document Mention；不误用某个文件类型图标 |
| [dsh-usage-stats](https://github.com/Make0209/dsh-usage-stats) | 16 | 侧边栏按钮内联 24 px stroke chart | 默认保留已渲染图标；用户可改为 16 px Chart Multiple |

抽样结论：当前 DSH manifest、market registry 与 `settings.section` 都没有统一 icon
字段；仓库中的 `icon.svg`、logo、favicon、README 截图含义也不一致。盲目扫描包文件
既不可靠又会选到品牌图、插画或彩色图。因此自动识别分成两类：

- 已渲染原图：侧边栏按钮已有专用 SVG 时默认保留。
- 已审核适配：包名/稳定 ID 与特定开源图标一一对应，图标和许可证随版本固定。

未来若 DSH 或 market registry 增加声明式 `{ icon, viewBox, license }` 元数据，可以把它
插入解析链的“插件自带”层，无需改变用户覆盖数据。

## 图标库选择

DSH primitives 当前约 70 枚图标，注释明确说明它们来自 DeepSuite/Figma，主要为
16 px、`currentColor`、预展开的填充路径。它们非常适合已有功能，但缺少市场、通知、
记忆、费用、统计、安全等完整语义。

候选比较：

| 库 | 优点 | 不采用为运行时主库的原因 |
| --- | --- | --- |
| [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons) | 原生 16 px Regular、填充路径、`currentColor`、MIT、语义覆盖完整 | 只需避免把完整包带进产物 |
| [Lucide](https://lucide.dev/) | API 清晰、图标多、tree-shakable | 默认 24 px / 2 px stroke，缩到 DSH 16 px 后偏粗且轮廓语言不同 |
| [Remix Icon](https://github.com/Remix-Design/RemixIcon) | 覆盖广、outline/filled 成对 | 主设计网格为 24 px，许可证与 DSH 原生节奏不如 Fluent 直接 |
| [Iconify](https://iconify.design/docs/) | 统一访问大量图标集 | 图标风格混杂；运行时 API 引入网络、隐私、缓存和失效风险 |

因此 `@fluentui/svg-icons` 仅是开发依赖。生成脚本读取明确的 16 Regular 文件，拒绝
script、image、style、事件、远程 URL 和硬编码色值，生成本地 TypeScript 常量。
最终浏览器 bundle 约 73 KB、gzip 约 21 KB，不包含完整 Fluent 包。

## 初始图标清单

- 核心：Settings、Apps、Store、Person、People、Home。
- 内容：Document、PDF、Document Mention、Folder/Open、Archive、Bookmark、
  Import/Export、Download/Upload、Image。
- 智能与工具：Brain、Database、Eye、Code、Plug、Toolbox、Wrench、Sparkle。
- 运行与安全：Alert、Wallet、Money、Receipt、Shield/Shield Lock、Key、Lock、
  Search、Globe、Chart、History、Calendar、Info、Warning、Cloud。
- 界面：Paint Brush、Color、Grid、Panel Left/Right、Panel Gallery、Chat、Window Apps。
- 插件精确适配：dsh-market block-grid。

该范围足以覆盖常见功能，同时让选择器保持可浏览。以后增加图标必须同时增加用途、
别名、来源、许可证与 16 px 光学校验，而不是直接暴露数千枚全集。

## 解析优先级

1. 用户对稳定目标键的手动覆盖。
2. 已审核、静态打包的插件精确图标。
3. 在“优先原图”策略下保留非通用的 DSH/插件现有图标。
4. 稳定 ID 精确预设。
5. 稳定 ID 中唯一、无歧义的语义推断。
6. 保留现有回退图标；没有任何原图时才使用 Settings。

标签不会参与自动应用，因为中英文切换、重名和插件改文案都会造成错误。它只进入
搜索和未来的低置信度建议区。

## 设置体验

“设置 → 图标”页面显示发现总数、两类表面兼容状态、搜索和筛选。每行展示当前预览、
用户可读标签、稳定键、解析来源，以及“更改 / 恢复自动”。图标选择器支持中英文别名
搜索。配置只保存手动覆盖与原图策略；检测结果、标签、DOM 索引和默认映射均不落盘。

## 配置持久化边界

DSH 0.1.0-rc.6 的通用 `settingsScope` Web 协议只暴露产品白名单和可配置模型供应商；
单纯注册第三方设置命名空间仍会得到 `settings-not-exposed`。图标主题不是模型供应商，
因此不会用虚假的 provider 条目绕过边界，也不会修改用户安装的 DSH bundle。

Host 端改为提供 `/_dsh/icon-theme/settings` 固定端点：只接受 POST、同源 Fetch Metadata
以及非简单请求头，只能对 `pack`、`overrides`、`originalPolicy` 三个顶层路径执行
Settings mutate，并携带 revision 做冲突检测。它继续使用 DSH Settings provider 落盘，但
无法枚举或修改其他命名空间。浏览器端首次读取失败时明确进入只读状态，不会静默写入
localStorage 形成两个真相来源。
