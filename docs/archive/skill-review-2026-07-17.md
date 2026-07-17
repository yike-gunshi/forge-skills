# Forge 体系外部对标审查 — 2026-07-17

> 三路并行审查：① Anthropic 官方 skill-creator 标准合规、② yao-meta-skill 方法论（token 效率 / 可执行性 / 可移植性 / 评估严谨性）、③ 参考知识新旧与内部一致性审计。
> 事实性问题已当日修复（见 CHANGELOG v2026.07.17）；结构性改进按"每项单独讨论定案后动手"原则进 TODO 阶段 6。

## 总体结论

**水平：中上（对照两套外部标准均达标线以上）。**

- 强项：forge-qa / forge-bugfix 的"骨架铁律 + 阶段手册"是 progressive disclosure 的教科书级实现；全部 15 个 SKILL.md 均未破官方 500 行硬限；description 普遍符合"做什么 + 何时用"；forge-status 硬信号判定、forge-ship 七态区分、fupan v2 账本机制是可验证指令的典范。
- 三类主要债务：
  1. **上下文纪律**：全体系约 8-9% 是可零损失删减的重复与口号文本（最大单项：AskUserQuestion 格式规范在 8 个 skill 逐字重复约 1600 字符，且已出现措辞漂移）。
  2. **可移植性**：forge-ship / forge-status / forge-qa 泄漏了 info2action 项目或 Codex 环境特异内容，与"换项目不失效"目标相悖。
  3. **评估严谨性**：15 个 description 定义了 60+ 触发短语，零触发评估用例；forge-review 与环境内置 code-review / verify / review 无路由消歧（yao 方法论权重最高的一项，20%）。

## 一、官方 skill-creator 标准要点（审查依据）

1. SKILL.md 主体 < 500 行，接近上限应层级化，细节下沉 references/
2. 三级渐进披露：metadata（常驻）→ SKILL.md（触发加载）→ references/scripts/assets（按需）
3. description = 做什么 + 何时触发，写明触发语境
4. references 必须被 SKILL.md 明确引用并说明何时加载；>300 行的 reference 加 TOC
5. 保持精简、消除重复；祈使句 + 解释 why；反过拟合（不写死个案）

## 二、逐 skill 评分表

| Skill | 行数 | 主要问题 | 严重度 |
|---|---|---|---|
| forge（入口） | 175 | 清单表与 description 轻度重复（作路由用，可接受） | 低 |
| forge-eng | 492 | 贴 500 行红线；第 10 步 bash 与 worktree-guide.md 重复；"工程思维框架"口号区约 900 字符无 pass/fail；逐条 AskUserQuestion 策略与 forge-review 批量策略矛盾 | 高 |
| forge-ship | 488 | 贴红线 + 零 references，12 步全内联；内嵌 info2action 专属命令（过拟合） | 高 |
| forge-dev | 458 | 灰区表 / RESEARCH 模板 / --auto 细则应下沉 orchestration-details.md；"检查 OWASP Top 10"等越权且不可验证的质量规则 | 高 |
| forge-brainstorm | 385 | "重要规则"节大面积复述铁律（"一次一个问题"出现 3 次）；提问集可下沉 | 中 |
| forge-design | 360 | "设计师认知模式"12 条口号区；数据资源表与资源节重复；~~CSV 计数过时~~（已修） | 中 |
| forge-prd | 354 | ~~流程双图重复、编号 bug~~（编号已修，双图待定）；"CEO"角色扮演表述 | 中 |
| forge-doc-release | 352 | 零 references；description 无触发方式 | 中 |
| forge-qa | 313 | 正面样板；43-85 行伪 bash 不可运行（判定表已覆盖同逻辑）；铁律 8 Codex 特异内容；mode-a-execution.md（1006 行）无 TOC | 中 |
| forge-status | 215 | 判定"脚本"真伪代码混排（非循环上下文用 continue）；端口表 / grep 关键词泄漏 info2action；宣称 prd/eng 登记 active.md 与实际不符（实际仅 bugfix 登记） | 中 |
| forge-design-impl | 210 | 无 references；反 AI 模板与 design/dev 三处重复；shadcn 常识表可砍 | 低 |
| forge-review | 209 | description 缺触发方式；与内置 code-review/verify 零路由消歧 | 低 |
| forge-bugfix | 183 | 同一批约束三处表述（铁律/红线/速查）；description 240 字符偏长 | 低 |
| forge-fupan | 125 | 全体系密度最高；workbench 完整应用（41MB 含 node_modules）躺在 skill 目录内，污染包边界 | 中 |
| forge-doc-policy | 110 | 文件清单表 6 项 ⏳ 未实现混入真相源（future-outline-vs-build 反模式），被迫用三段防御文本对冲 | 低 |

## 三、跨体系发现

1. **AskUserQuestion 格式规范逐字重复 8 处**（eng/ship/dev/prd/qa/design/review/doc-release），且 prd 版已漂移出"CEO"和可视化条款——重复副本必然漂移，正是本仓库 symlink 架构反对的事。
2. **状态标记协议表（⏳🔄✅❌⏸️）重复 3 处**（design/eng 全文、qa 简版）。
3. **反 AI 模板主题出现 3 次**（design、design-impl 最全、dev），应单源引用 design-impl 版。
4. **"重要规则"尾部模式**：几乎每个 skill 末尾复述正文，合计约 2500 字符；铁律单点出现反而更有权威。
5. **交互策略自相矛盾**：forge-eng"每发现一个问题单独提问、绝不批量" vs forge-review"批量放入一次 AskUserQuestion"。
6. **触发评估缺失**：零触发/不触发用例；bugfix 触发面极宽（"这里有问题"、"为什么不对"）。

## 四、一致性审计结果（已修 / 待定）

### 当日已修（2026-07-17，详见 CHANGELOG）

- deliver 退役残留：forge-user-guide（含缺失的 doc-policy 章节顶替原 deliver 第 12 节）、workflow-guide、architecture 全部对齐 `/forge-dev --full` + `.forge/`
- forge-prd 项目 CLAUDE.md 模板 `.deliver/state.json` → `.forge/dev-state.json`（会写进每个新项目的高危旧路径）
- forge-qa Mode A 视觉意图参考补 `.forge/visual-decision.md`
- fupan v2 口径：visual-decision-layer 生命周期表、fupan SKILL.md 过期措辞、README fupan 描述
- README：README_EN 断链、skill 数量口径（14+1）、结构图补 `_shared/`
- 计数与小 bug：design CSV 计数（161/73/84/34）、user-guide 图片路径、doc-paths 幽灵路径 `.forge/backlog.md`、prd 重复编号"4."、review-checklist 残留 gstack、user-guide 的 gstack 引擎与 bugfix 旧阶段描述
- CHANGELOG：补记 2026-07-04 大重构，清理与 v2 矛盾的 [Unreleased] 旧契约

### 审计确认无误的方面

- 全部 SKILL.md → references/templates/scripts 交叉引用无断链，无孤儿文件
- bugfix P6 ↔ qa Mode B 参数契约单源一致
- forge-dev --full 尾段调度的三个 skill 均在役且时机描述吻合
- fupan learnings-schema 与真实账本逐条吻合，回放钩子两个读取方真实存在
- install.sh 自动发现覆盖全部 skill + 根 forge + _shared，三路径一致
- 无过时模型名硬编码

### 遗留待定（需用户拍板，见 TODO 阶段 6）

- forge-status 宣称 prd/eng 登记 active.md，实际只有 bugfix 登记：补登记步骤 or 收窄表述？
- forge-dev 的 `docs/{版本号}-CONTEXT/RESEARCH.md` 落点不在 doc-paths 白名单：白名单增补 or 改落点？
- 仓库根 `.do-dev/` 本地残留（未入库）可删

## 五、结构性改进建议（Top 10，待逐项确认）

| # | 建议 | 预估收益 |
|---|---|---|
| 1 | AskUserQuestion 格式规范提取 `_shared/interaction-protocol.md`，8 skill 改一行引用；顺带统一批量策略（建议按 review 模式：≤3 单独问，>3 批量） | 省约 1400 字符/触发；根治漂移；解决 eng/review 矛盾 |
| 2 | forge-ship 拆 references（merge-and-sync 手册）+ 删 info2action 专属命令 | 488 → ~250 行；消除过拟合 |
| 3 | forge-eng 第 10 步 bash 归 worktree-guide + 砍口号区 | 脱离红线，省 ~70 行 |
| 4 | forge-dev 细节下沉 orchestration-details.md + 删越权质量规则 | 458 → ~300 行 |
| 5 | forge-qa 删伪 bash 模式判断块（保留判定表）+ Codex 内容移环境适配说明 | 省约 1500 字符；消除误导 |
| 6 | 状态标记协议表提取 `_shared/feature-status-protocol.md` | 单一出处 |
| 7 | fupan workbench 迁出 skill 目录（如 `tools/fupan-workbench/`） | 净化 skill 包边界 |
| 8 | 各 skill 尾部"重要规则/速查"去重（只留正文未出现条目） | 合计省约 2000 字符 |
| 9 | 最小触发评估 `evals/trigger-cases.md`（20-30 条触发/不触发/易混淆，重点 bugfix 宽触发 + review vs 内置 code-review 消歧）；补 doc-release/review 的 description 触发方式 | 补最大方法论缺口 |
| 10 | >300 行 references 补 TOC（mode-a-execution 1006 行必须；p6-p7、p3-p5、thinking-doc-template 同查）；doc-policy ⏳ 项移出清单表进 CHANGELOG | 按需跳读；消 future-outline 反模式 |

预估 #1-#8 落地后 SKILL.md 总量减约 8-9%，全部为零执行损失删减。

---

## 六、整改落地与复测（同日追记）

用户授权后 F1-F12 当日全量落地（见 TODO 阶段 6 与 CHANGELOG v2026.07.17.1）。skill-creator 标准复测结果：**A-**。

- 行数：eng 492→399、ship 488→286、dev 458→326、qa 313→244；15 个 SKILL.md 总量 4429→3876（-12.5%），top3 为 eng 399 / brainstorm 382 / doc-release 347，全部远离 500 行红线。
- 重复：SKILL.md 层 8 处 ask 规范复制→0，3 处状态表复制→0（复测在 reference 层又揪出 2 处残留，已改一行引用）。
- 断链：全量指针核验零断链（复测发现 doc-policy 概览表 2 个未实现脚本引用与 1 处相对路径写法，已修）。
- 可移植性：skills/ 内 info2action 特异内容清零（仅剩账本示例数据与历史记录中的合理提及）。
- 15/15 frontmatter 合法，description 全部含"做什么 + 何时触发"。

复测遗留的可选项（下轮再议）：forge-eng（399）与 forge-brainstorm（382）仍是最大两个文件，可继续瘦身但已合规。

## 七、第二轮瘦身（同日追记，复测遗留项清零）

复测遗留项与两份报告中未进 F 清单的次级建议当日一并清零：eng 399→275（四章审查细则/交付模板下沉）、doc-release 347→156（新建 release-details 手册，告别零 references）、brainstorm 382→315（提问集下沉 question-banks）、design 337→312（认知模式压缩为 4 条自检项）、design-impl 210→201（shadcn 常识表删除）、prd 343→332（双流程图二选一）、doc-policy 历史叙事收敛。

**最终账**：15 个 SKILL.md 总量 4429 → 3449 行（**-22.1%**），最大文件 492 → 332；全库 SKILL.md → references 指针零断链。明确不做的项维持原决策：test-dimensions 不物理拆分（2026-07-04 用户拍板）、audit-project.sh 维持"未来能力"暂缓（减法原则）。
