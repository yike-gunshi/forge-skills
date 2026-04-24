# Forge 视觉决策层

当任务涉及人类判断、设计气质、页面布局、复杂流程或学习复盘时，先判断是否需要可视化辅助。目标不是多画图，而是更早暴露误解、更快让用户做判断。

## 目录

- [三类视觉产物](#三类视觉产物)
- [触发规则](#触发规则)
- [生命周期](#生命周期)
- [产物保存约定](#产物保存约定)
- [Image 2 生成方式](#image-2-生成方式)
- [Prompt 约束](#prompt-约束)
- [UI 视觉稿 Prompt 模板](#ui-视觉稿-prompt-模板)
- [复盘学习图 Prompt 模板](#复盘学习图-prompt-模板)
- [写入文档的最小格式](#写入文档的最小格式)

## 三类视觉产物

| 类型 | 用途 | 适用场景 | 不适用场景 |
|---|---|---|---|
| Mermaid / show-widget | 结构化、可复现的图 | 流程、因果链、对比矩阵、状态机、学习地图 | 需要判断真实视觉气质 |
| Image 2 视觉稿 | 高保真想象图、观感预判 | UI 首屏、复杂组件、空态/错态、品牌气质、复盘知识隐喻 | 精确数据图、测试证据、可由 Mermaid 表达的结构 |
| 真实截图 / Figma 导出 | 最终事实证据 | 实现后验收、设计还原对比、复盘存档 | 前期概念探索 |

## 触发规则

满足任一条件时，考虑生成视觉产物：

- 用户需要在多个方向之间做判断，且文字难以传达差异。
- 设计会进入前端实现，且页面/组件/状态会影响实际观感。
- 流程超过 5 个节点、方案超过 3 个、或因果链超过 3 层。
- 复盘中有新的心智模型、行为模式或领域知识，适合做一张可回看的学习图。

不要生成视觉产物：

- 简单 A/B 决策，文字能 30 秒讲清。
- 视觉结果不会改变后续决策。
- 需要精确验收时。验收用真实截图、CSS 断言和测试输出，不能用 Image 2 当证据。

## 生命周期

| 阶段 | 视觉产物 | 规则 |
|---|---|---|
| brainstorm | Mermaid / show-widget；必要时 Image 2 概念图 | 先画结构，只有 UI/气质判断需要时才出 Image 2 |
| PRD | Feature Spec 中记录视觉决策需求和已有图链接 | PRD 不追求高保真，但要把下游需要看的图说清 |
| design | Image 2 视觉稿门禁 | 新页面/新模块必须先出 1-3 张图给用户确认，确认后再定 DESIGN.md |
| design-impl / eng | 以 DESIGN.md 为真相源，Image 2 作为观感参考 | 实现后用真实截图替换或并列对比 Image 2 |
| QA | 真实截图 + CSS/行为断言 | Image 2 只帮助解释偏差，不作为 pass/fail |
| fupan | show-widget 仪表盘强制；Image 2 学习图按需 | 把新知识、行为模式或决策路径做成可回看的视觉锚点 |

## 产物保存约定

- 思考/设计阶段：`docs/讨论/{模块名}/assets/`
- 普通项目无 `docs/讨论/` 时：`docs/assets/visuals/`
- 复盘阶段：`~/claudecode_workspace/记录/复盘/{项目名}/assets/`
- 文件命名：`{YYYY-MM-DD}-{阶段}-{用途}.png`
- 同目录保存 prompt：`{同名}.prompt.md`
- 同目录保存元数据：`{同名}.meta.json`

每张图必须在相关文档中记录：

```markdown
![视觉稿](assets/2026-04-24-design-home-desktop.png)

- **图类型**: Image 2 视觉稿 / show-widget 图 / 真实截图
- **决策用途**: 用户需要判断什么
- **状态**: draft / confirmed / replaced-by-real-screenshot
- **后续处理**: 确认后写入 DESIGN.md / 实现后用 Playwright 截图替换
```

## Image 2 生成方式

优先使用当前运行环境内置的图片生成工具；如果需要落盘并且有 `OPENAI_API_KEY`，使用：

```bash
python3 {当前 forge skill 目录}/../_shared/generate_image2.py \
  --prompt-file docs/讨论/{模块名}/assets/{name}.prompt.md \
  --out docs/讨论/{模块名}/assets/{name}.png \
  --size 1536x1024 \
  --quality medium
```

如果没有可用的图片生成工具或 API key，输出完整 prompt pack，保存到目标 `assets/` 目录，并明确告诉用户当前只完成了 prompt 准备，尚未生成图片。

## Prompt 要求

Image 2 prompt 必须包含：

- 产品/页面类型、目标用户、使用场景。
- 当前要判断的决策点。
- 设备与画幅：desktop / mobile / component close-up。
- 信息层级：首屏最重要内容、次级内容、可交互元素。
- 设计约束：颜色 token、字体、间距、圆角、密度、禁用风格。
- 真实文案：使用项目中的实际字段名和按钮文案，不写 Lorem ipsum。

禁止：

- 在 AI 生图/生视频 prompt 中使用真人人名；用外观描述替代。
- 把 API key、token、内部路径、用户隐私写入 prompt。
- 把工具型前端画成营销 hero、玻璃拟态大卡片、紫蓝渐变、装饰性圆球。
- 把 Image 2 当作 QA 通过证据。

## UI Prompt 模板

```markdown
Draw a high-fidelity product UI screenshot for {产品/功能}.

Decision to validate: {这张图要帮助用户判断什么}.
User and context: {谁在什么场景使用}.
Device: {desktop 1440x900 / mobile 390x844 / component close-up}.

Information hierarchy:
1. Primary focus: {首要区域}
2. Secondary content: {次要区域}
3. Actions: {按钮/输入/筛选/状态}

Design system:
- Color tokens: {颜色}
- Typography: {字体/字号层级}
- Spacing and radius: {间距/圆角}
- Density: {紧凑/中等/宽松}

Content constraints:
- Use these exact labels: {真实文案}
- Show realistic data rows/cards: {样例数据}
- Include these states if relevant: {loading/empty/error/selected}

Avoid:
- Marketing hero composition
- Decorative gradient blobs or floating shapes
- Generic SaaS feature cards
- Text overflow or overlapping elements
```
