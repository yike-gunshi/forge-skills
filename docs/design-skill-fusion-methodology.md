# 设计 Skill 融合方法论

> 本文档描述 forge-design 如何整合外部设计 Skill 的能力，以及未来迭代的方法。
> 当新增外部 Skill 或已有 Skill 更新时，按本文档的流程进行重新评估和整合。

---

## 一、整合原则

### 1.1 分层整合，不重复造轮

forge-design 是**调度层**，外部 Skill 是**能力层**。整合 = 在 forge-design 的流程节点上调用外部能力，不是把外部 Skill 的内容复制进来。

```
forge-design（调度 + 门控 + 文档管理）
  ├── 调用 design-consultation 的竞品调研和美学方向探索
  ├── 调用 ui-ux-pro-max 的搜索引擎和 UX 规则库
  ├── 调用 frontend-design 的反 AI-slop 编码指导
  ├── 调用 plan-design-review 的 0-10 交互审查
  ├── 调用 ckm-design-system 的 Token 架构
  ├── 调用 ckm-ui-styling 的组件库参考
  └── 调用 web-design-guidelines 的合规检查
```

### 1.2 外部 Skill 原封不动

不修改外部 Skill 的 SKILL.md。整合方式是在 forge-design 中**引用**（`参考 /design-consultation 的 Phase 2`），不是**内嵌**。这样外部 Skill 更新时 forge-design 自动获益。

### 1.3 能力分类

每个外部 Skill 的能力按以下维度分类：

| 维度 | 归属 | 说明 |
|------|------|------|
| **设计探索** | forge-design 第1步 | 风格方向、竞品调研、配色字体搜索 |
| **设计规范** | forge-design 第2-3步 | UX 规则、Token 架构、组件状态定义 |
| **设计审查** | forge-design 第6步 | 0-10 评分、合规检查、反 AI-slop |
| **代码实现** | forge-eng 而非 forge-design | Tailwind 配置、shadcn/ui 组件代码、React 模式 |
| **品牌资产** | 独立调用 | Logo、CIP、Banner — 不纳入 forge-design 主流程 |

**关键区分**：代码实现类能力归 do-eng，forge-design 只负责**设计决策**，不负责写代码。这与当前 forge-design 第5步"实现设计变更"有冲突——见审计报告。

---

## 二、外部 Skill 能力全景

### 2.1 能力清单

| 外部 Skill | 位置 | 核心能力 | 整合到 forge-design 的部分 | 不整合的部分 |
|-----------|------|---------|----------------------|------------|
| **design-consultation** | gstack | 竞品调研(WebSearch+browse)、3+美学方向、SAFE/RISK分解、字体配色预览页、DESIGN.md模板 | 竞品调研流程、美学方向探索、SAFE/RISK框架、预览页生成 | DESIGN.md模板（用forge-design现有的）、gstack遥测/升级框架 |
| **ui-ux-pro-max** | 独立 | 99条UX规则(10类)、161配色、57字体、search.py搜索引擎、--design-system自动推荐、--persist持久化 | UX规则的10大分类补充审计、search.py的配色/字体/产品搜索、交付前检查清单 | React Native专属指导、技术栈代码模板 |
| **frontend-design** | 独立 | 反AI-slop方法论、前端美学5维度(排版/配色/动效/空间/背景)、字体黑名单、实现复杂度匹配 | "先方向后代码"原则、5维度设计检查、反AI-slop扩展清单、字体黑名单 | 具体CSS/React代码实现 |
| **plan-design-review** | gstack | 7维度0-10评分(信息架构/交互状态/用户旅程/AI-slop/设计体系/响应式/待定决策)、12认知模式、Boil the Lake原则 | 0-10评分方法引入第3步方案确认、7维度审查框架补充第6步 | gstack遥测/升级框架、Review Readiness Dashboard |
| **ckm-design-system** | 独立 | 三层Token(primitive→semantic→component)、CSS变量体系、generate-tokens脚本、validate-tokens脚本 | 三层Token理念写入DESIGN.md模板要求 | Token生成脚本（forge-eng领域）、幻灯片系统 |
| **ckm-ui-styling** | 独立 | shadcn/ui组件分类参考、Tailwind最佳实践、暗色模式实现、无障碍模式、Canvas设计哲学 | 组件选择指导、无障碍模式清单 | shadcn/ui安装配置、Tailwind代码、Canvas设计 |
| **web-design-guidelines** | agents | 实时拉取Vercel Web Interface Guidelines、逐文件合规检查 | 第6步质量评估的补充验证 | 作为独立工具调用，不嵌入流程 |

### 2.2 能力版本追踪

| Skill | 当前版本 | 最后审查日期 | 下次审查触发条件 |
|-------|---------|------------|----------------|
| design-consultation | 1.0.0 | 2026-03-26 | gstack 更新时 |
| ui-ux-pro-max | — | 2026-03-26 | search.py 或数据文件变更时 |
| frontend-design | — | 2026-03-26 | SKILL.md 内容变更时 |
| plan-design-review | 2.0.0 | 2026-03-26 | gstack 更新时 |
| ckm-design-system | 1.0.0 | 2026-03-26 | references/ 下文件变更时 |
| ckm-ui-styling | 1.0.0 | 2026-03-26 | references/ 下文件变更时 |
| web-design-guidelines | — | 2026-03-26 | agents 目录更新时 |

---

## 三、整合映射：forge-design 流程节点 × 外部能力

### 第0步：定位项目文档 + 门控判断

**现有能力**：定位 PRD、DESIGN.md、CHANGELOG

**新增整合**：
- **分级门控判断**（自有逻辑）：
  - L1 完整：新项目/新页面/新独立功能模块 → 走完整设计流程
  - L2 轻量：迭代已有功能/样式微调 → 轻量审查
  - L3 跳过：纯后端/API/无UI变更 → 直接跳过设计
- **迭代不满触发器**（自有逻辑）：PRD CHANGELOG 中同一模块迭代 ≥3 次 → 自动从 L2 升级到 L1
- **子模块一致性标记**（自有逻辑）：检测是否属于更大页面的子模块，标记需要读取父 DESIGN.md

### 第1步：理解现状 / 从零创建

**现有能力**：提取代码中的字体/颜色/间距、4轮用户确认

**新增整合**：
- ← `design-consultation` Phase 1-2：产品上下文理解 + 竞品调研（WebSearch + browse 截图）
- ← `design-consultation` Phase 3：3+ 美学方向探索 + SAFE/RISK 分解
- ← `ui-ux-pro-max` search.py `--design-system`：基于产品类型自动推荐配色/字体/风格
- ← `frontend-design` Design Thinking：目的/调性/约束/差异化四问
- ← `design-consultation` Phase 5：字体+配色 HTML 预览页生成

**整合方式**：forge-design 第1步扩展为 5 个子步骤：
1. 产品上下文（现有 + design-consultation Phase 1）
2. 竞品调研（design-consultation Phase 2，可选）
3. 美学方向探索（design-consultation Phase 3 + frontend-design 四问）
4. 配色/字体搜索（ui-ux-pro-max search.py）
5. 预览页确认（design-consultation Phase 5）

### 第2步：设计审计

**现有能力**：80 项清单（10 类）

**新增整合**：
- ← `ui-ux-pro-max` Quick Reference：99 条 UX 规则的 10 大分类，补充现有清单的细粒度
  - 重点补充：无障碍(14条)、触摸交互(17条)、表单反馈(28条)、导航(26条)、图表(30条)
- ← `frontend-design` 美学5维度：排版/配色主题/动效/空间构图/背景视觉细节
- ← `frontend-design` 反 AI-slop 扩展：字体黑名单（Inter/Roboto/Arial）、过度使用字体列表、Cookie-cutter 模式

**整合方式**：不替换现有 80 项清单，而是增加"补充审计层"——在 10 类审计的基础上，对重点维度用 ui-ux-pro-max 的规则做深度检查。

### 第3步：设计方案

**现有能力**：ASCII 线框图、组件设计、设计体系变更、交互方案

**新增整合**：
- ← `plan-design-review` 0-10 评分法：对关键设计决策用 0-10 打分 + 解释满分标准
- ← `ckm-design-system` 三层 Token 架构：新项目的 DESIGN.md 要求使用三层 Token 结构
- ← `plan-design-review` 交互状态覆盖表：LOADING/EMPTY/ERROR/SUCCESS/PARTIAL 全覆盖
- ← `plan-design-review` AI Slop 风险评估：检查方案是否落入泛用模式
- **子模块一致性检查**（自有逻辑）：读取父页面 DESIGN.md，检查配色/字体/间距/组件风格一致

**整合方式**：方案确认阶段增加结构化评审步骤，不再只是"展示方案等确认"，而是"评分 → 解释差距 → 修正 → 再评"的迭代循环。

### 第6步：设计质量评估

**现有能力**：A-F 评分 + 10 类权重

**新增整合**：
- ← `ui-ux-pro-max` Pre-Delivery Checklist：视觉质量/交互/亮暗模式/布局/无障碍 5 类交付前检查
- ← `web-design-guidelines` 合规检查：Vercel Web Interface Guidelines 逐文件扫描
- ← `plan-design-review` Completion Summary：结构化完成报告（分数变化 + 决策追踪）

**整合方式**：在 A-F 评分基础上，增加交付前检查清单验证。L1 门控要求评分 ≥ B 才能进入 forge-eng。

---

## 四、未来迭代流程

当新增外部设计 Skill 或已有 Skill 更新时，按以下步骤操作：

### Step 1：能力审计

```
1. 读取新/更新 Skill 的完整 SKILL.md
2. 提取能力清单（不是功能列表，是"这个 Skill 让 AI 能做什么"）
3. 按 §1.3 的能力分类维度归类
4. 与 §2.1 的现有能力全景对比，标记：
   - 新增能力（现有体系没有的）
   - 增强能力（现有体系有但更弱的）
   - 冗余能力（与现有完全重叠的）
   - 冲突能力（与现有矛盾的）
```

### Step 2：整合决策

```
对每个非冗余能力：
1. 归属判断：属于 forge-design 的哪个步骤？还是属于 do-eng/do-qa？
2. 整合方式：引用（在流程节点上调用）还是嵌入（规则/清单合并）？
3. 门控影响：是否影响分级门控逻辑？
4. 向后兼容：是否影响现有 DESIGN.md 模板？
```

### Step 3：更新文档

```
1. 更新 §2.1 能力清单表
2. 更新 §2.2 版本追踪表
3. 更新 §3 中受影响的流程节点
4. 更新 forge-design/SKILL.md（如需修改流程）
5. 更新 skills-reference.md 中 forge-design 章节
```

### Step 4：验证

```
1. 用一个真实项目跑一遍更新后的 forge-design 全流程
2. 检查外部 Skill 调用是否顺畅（路径正确、参数匹配）
3. 检查门控逻辑是否正确触发
4. 复盘并记录发现
```

---

## 五、已知限制与风险

### 5.1 上下文预算

forge-design 作为 do-dev 的子 skill，上下文预算有限。如果在一个会话中调用多个外部 Skill（design-consultation 竞品调研 + ui-ux-pro-max 搜索 + plan-design-review 7维度审查），可能耗尽上下文。

**缓解**：
- L2 轻量模式跳过竞品调研和完整审查
- 搜索引擎调用（search.py）产出紧凑，不占太多上下文
- 7维度审查按需进行，不强制全部7个维度

### 5.2 外部 Skill 依赖

- `design-consultation` 依赖 gstack 框架（遥测、升级检查、browse 浏览器）
- `ui-ux-pro-max` 依赖 Python 3 + search.py 脚本
- `web-design-guidelines` 依赖网络访问（拉取 Vercel 规则）

在离线或工具缺失环境下，这些能力会降级但不应阻塞流程。

### 5.3 DESIGN.md 模板冲突

design-consultation 和 forge-design 各有自己的 DESIGN.md 模板。整合后以 forge-design 的模板为准，但吸收 design-consultation 模板中的优秀结构（SAFE/RISK 分解、Decisions Log）。

---

## 六、快速参考：谁负责什么

| 问题 | 答案 |
|------|------|
| 配色/字体搜索用什么？ | `ui-ux-pro-max` search.py `--design-system` |
| 竞品调研怎么做？ | `design-consultation` Phase 2（WebSearch + browse） |
| UX 规则查哪里？ | `ui-ux-pro-max` Quick Reference 10 大类 |
| 反 AI-slop 清单在哪？ | forge-design 10 个反面模式 + `frontend-design` 字体黑名单 |
| Token 架构怎么设计？ | `ckm-design-system` 三层架构 |
| 组件选型参考？ | `ckm-ui-styling` shadcn/ui 组件分类 |
| 设计方案怎么评分？ | `plan-design-review` 7 维度 0-10 评分 |
| Vercel 规范合规？ | `web-design-guidelines` 逐文件检查 |
| 预览页怎么生成？ | `design-consultation` Phase 5 HTML 预览页 |
