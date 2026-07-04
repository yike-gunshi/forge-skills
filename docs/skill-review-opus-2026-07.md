---
status: live
type: research
module: global
last_updated: 2026-07-04
owner: opus-4.8-independent-review
---

# Forge Skill 体系第三方独立评审（Opus 4.8）

> 评审对象：`/Users/dbwu/claudecode_workspace/工具/forge-cookbook/`（14 个子 skill + `forge` 总入口 + `_shared`）
> 评审基准：Anthropic 官方 `skill-creator/SKILL.md`（2026-07-04 通过 WebFetch 取得，可解析成功）。核心尺子：
> - SKILL.md 正文 **< 500 行**，逼近上限就加一层层级 + 明确指针
> - 渐进披露三层：metadata（约 100 词，常驻）→ SKILL.md 正文（触发时加载）→ bundled resources（按需）
> - reference 文件 **> 300 行须带目录（TOC）**，且必须从 SKILL.md 明确引用并说明何时读
> - description 要"稍微 pushy"，讲清 what + when；imperative 语气；少用全大写 ALWAYS/NEVER
> - 目录规范：`scripts/`（可执行）、`references/`（文档）、`assets/`（模板）
>
> 立场：与被评审对象无利益关系。先独立判断，最后再对照他们的自评 `skill-audit-2026-07.md`。

---

## ① 总评分（按 skill-creator 规范逐项 A–F）

| 维度 | 评分 | 一句话理由 |
|---|---|---|
| 1. Frontmatter 格式合规 | **A** | 15 个 SKILL.md 全部含 `name` + `description`，YAML 可解析，无格式错误 |
| 2. name / description 质量 | **A-** | description 普遍优秀：what+when+触发词齐全、够 pushy、附"铁律"钩子；扣分项是 forge-doc-policy 的 description 宣传了尚未建的 `audit-project.sh` |
| 3. SKILL.md 体量（<500 行） | **C** | bugfix/qa/fupan/prd/design 已骨架化达标；但 **forge-eng 673 行、forge-dev 521 行** 仍是单体，超标，重构没覆盖到它俩 |
| 4. 渐进披露（progressive disclosure） | **B-** | bugfix（182 行骨架 + 4 本阶段手册）、qa（313 行 + Mode A/B/dimensions）是范本级；但 eng/dev 把全流程内联在骨架里，references 只放模板，等于没做渐进披露 |
| 5. references/scripts/assets 组织 | **C+** | 结构清晰、指针大多带加载时机；但有：3 个被引用却未建的脚本、2 个残留的旧 `docs/` 手册、2 个 >1000 行无 TOC 的巨型 reference |
| **综合** | **B-** | 骨架化方向正确、bugfix/qa 链路工程质量高；但重构只做了一半（eng/dev 漏网），且清理不彻底（README/gstack/旧 docs 残留） |

---

## ② 硬性检查清单结果

| 检查项 | 结论 | 证据 |
|---|---|---|
| 所有 SKILL.md frontmatter 可解析且含 name/description | ✅ PASS | 15/15 均 `name=…` + `description=1`（含总入口 `forge`） |
| 正文引用的 `references/*.md` 真实存在 | ✅ PASS | 逐个 grep 校验，所有 `references/*.md` 命中文件 |
| 正文引用的 `scripts/*` 真实存在 | ❌ FAIL | forge-doc-policy SKILL 引用 `scripts/audit-project.sh`、`scripts/backfill-frontmatter.sh`、`scripts/build-index.sh`，实际只有 `init-project.sh`（正文表格标了 ⏳ 未建，属半诚实） |
| `~/.claude/skills/...` 锚点路径可达 | ⚠️ 基本 PASS，1 处 MISSING | `_shared/*`、`forge-doc-policy/doc-paths.md`、`frontmatter-schema.md`、`init-project.sh`、`forge-qa/SKILL.md` 全部可达；**`forge-doc-policy/scripts/audit-project.sh` 不存在**（SKILL 第 65 行给了这个锚点） |
| 无 forge-deliver 悬空引用（退役说明除外） | ❌ FAIL | 总入口 `SKILL.md` 已正确写"已并入"；但 **`README.md` 仍把 `/forge-deliver` 当活命令**（第 22/111/112/178/299/328 行：--auto/--resume/8 Phase/目录树/"15 个 Skill"） |
| 无 gstack/browse 悬空引用（`.gstack/` 目录名除外） | ❌ FAIL | 见问题 #3，多处：forge-eng 两个 reference、forge-dev 探针、forge-bugfix/forge-qa 残留 `docs/README.md`、forge-fupan schema 注释 |
| description 触发词与正文声称能力一致 | ⚠️ 基本一致，1 处不符 | 绝大多数一致；forge-doc-policy description 宣传"init-project.sh / audit-project.sh"，但 audit-project.sh 未建 |

---

## ③ 问题清单（按严重度排序）

### 🔴 P0-1：README.md 仍把已退役的 forge-deliver 当活命令
- **位置**：`README.md:22, 111, 112, 178, 299, 313, 328`
- **证据**：`"15 个 Skill 既可全链路串联（/forge-deliver）"`、`"/forge-deliver --auto → 前置沟通后全自动（8 Phase）"`、目录树里 `forge-deliver/ ← 端到端编排`、`skills/ ← 14 个子 Skill`（数量前后自相矛盾）。而实际 `skills/` 下已无 forge-deliver 目录，总入口 SKILL.md 也已写"原 forge-deliver 已并入 forge-dev --full"。
- **影响**：README 是新用户和外部读者的第一入口。用户照着敲 `/forge-deliver` 会直接失败，且"14 个 / 15 个"两处数字打架，损害可信度。
- **建议修法**：删除 README 所有 `/forge-deliver` 活命令段落，改为一句退役说明 + 指向 `forge-dev --full`；统一 Skill 计数；目录树删掉 forge-deliver 节点。

### 🔴 P0-2：forge-eng（673 行）与 forge-dev（521 行）未骨架化，超 500 行硬线
- **位置**：`skills/forge-eng/SKILL.md`（673 行 / 25 KB）、`skills/forge-dev/SKILL.md`（521 行 / 21 KB）
- **证据**：forge-eng 把第 0～第 10 步全流程内联在骨架里——第 7 步 Wave 并行执行独占 395–507 行（112 行）、任务拆分 328–395、worktree 创建 263–322 全部内联；references 只放 tdd/worktree/dev-env/verification/template **模板**，核心执行逻辑没有外移。forge-dev 同理，只有一个 orchestration-details.md，其余全在骨架。这与 bugfix（182 行骨架）/qa（313 行）的做法明显不一致。
- **影响**：违反 skill-creator 的 <500 行硬线；这两个是最常触发的主力 skill，每次触发就把 25 KB / 21 KB 灌进上下文，是本体系最大的常驻成本。所谓"巨型 SKILL 骨架化"实际漏掉了两个最大的。
- **建议修法**：把 forge-eng 的第 6～第 7 步（任务拆分 + Wave 执行）外移到 `references/wave-execution.md`，第 5.5～5.7 worktree/dev 外移（部分已有 worktree-guide.md，把内联命令也挪过去）；forge-dev 的第 1～第 4 步各阶段细则外移。目标把两者骨架压到 300 行内。

### 🟠 P1-1：gstack/browse 悬空引用散落在会加载的 reference 里
- **位置**：`skills/forge-eng/references/tdd-guide.md:91`、`verification-checklist.md:89`（"用 gstack/browse 截图验证"）；`skills/forge-dev/SKILL.md:37-38`（探测 `gstack/browse/dist/browse` 可执行文件）；`skills/forge-bugfix/references/p6-p7-acceptance.md:178,184`；`skills/forge-fupan/references/learnings-schema.md:4`（"设计参考 gstack /learn"）
- **证据**：gstack 不是本 cookbook 的一部分（`skills/` 下无 gstack），这些是对外部工具的裸引用。forge-dev 的探针有 `-x` 守卫，可优雅降级；但 forge-eng 两个 reference 把 gstack/browse 直接当作推荐截图手段写死。
- **影响**：新会话 AI 读到"用 gstack/browse 截图"会去找一个不存在的工具，浪费一轮试探；与 skill 现在主推的 `browser-use:browser` / Playwright 双引擎叙事不一致。
- **建议修法**：forge-eng 两个 reference 把 gstack/browse 换成 `browser-use:browser` / Playwright（与 qa/bugfix 口径统一）；forge-fupan 注释可保留（只是设计致谢）；forge-dev 探针可留但注明"可选外部工具"。

### 🟠 P1-2：两个残留的旧 `docs/` 手册（do-dev 时代产物）
- **位置**：`skills/forge-qa/docs/README.md`（`# /do-qa 使用手册 v2.0`）、`skills/forge-bugfix/docs/README.md`（`/do-bugfix … 基于 gstack/investigate … do-dev 生态`）
- **证据**：这两份 README 还在用改名前的 `/do-qa`、`/do-bugfix`、`do-dev`、`gstack/investigate` 叙事，是 gstack 引用的主要来源。
- **影响**：不会被 skill runtime 加载（runtime 只认 SKILL.md + 被引用的 references），但作为仓库死重会误导人工阅读、也污染全局 grep；与"刚完成大重构"的整洁度目标冲突。
- **建议修法**：删除或迁到 `_archive/`。

### 🟠 P1-3：forge-doc-policy 宣传/锚点了未建的脚本
- **位置**：`skills/forge-doc-policy/SKILL.md:3`（description）、`:21, 22, 36, 37, 38, 65, 91, 111`
- **证据**：description 里写"新老项目装载脚本（init-project.sh / **audit-project.sh**）"，正文锚点 `~/.claude/skills/forge-doc-policy/scripts/audit-project.sh`（不存在），另 `backfill-frontmatter.sh` / `build-index.sh` 也只在正文表格标 ⏳ 未建。实际 `scripts/` 只有 `init-project.sh`。
- **影响**：description 是常驻元数据，宣传了一个不存在的能力——AI 可能据此建议用户"跑 audit-project.sh 审计"，然后扑空。正文表格虽标了 ⏳ 算半诚实，但 description 和锚点没同步这个"未建"状态。
- **建议修法**：description 只保留 init-project.sh；audit/backfill/build-index 相关锚点行标注"（规划中，尚未实现）"或删除，等真建了再加。

### 🟡 P2-1：两个巨型 reference 无 TOC，违反 >300 行须带目录
- **位置**：`skills/forge-qa/references/test-dimensions.md`（**1922 行**，无 TOC）、`skills/forge-qa/references/mode-a-execution.md`（1006 行，仅零星表格）；次要：`p3-p5-fix-loop.md`（407 行无 TOC）
- **证据**：skill-creator 明确"reference 文件 >300 行须带目录"。test-dimensions 近 2000 行、64 KB，一旦"写测试脚本"触发就整体加载，且无 TOC 让 AI 难以只取所需维度。
- **影响**：上下文经济性差 + 检索效率低；这是"假瘦身"最实的一处——骨架瘦了，但一进 qa 写脚本就吞 64 KB。
- **建议修法**：test-dimensions 顶部加 10 维度锚点 TOC，或按维度进一步拆成 `references/dimensions/*.md`，让 AI 只加载当前要写的那一两个维度。

### 🟡 P2-2：总入口 Skill 清单漏列 doc-policy / doc-release
- **位置**：`SKILL.md:150-163`（"Forge 体系完整 Skill 清单"表）
- **证据**：表里只列了 12 个，缺 forge-doc-policy、forge-doc-release；标题却叫"完整清单"。
- **影响**：轻微。用户问"有哪些工具"时看不到文档治理/发布后文档两项。
- **建议修法**：补两行，或把标题改为"常用 Skill"。

---

## ④ 性能账本（上下文经济学）

### 常驻成本（metadata，每次会话都在）
| 项 | 大小 |
|---|---|
| 15 个 SKILL 的 description 合计（frontmatter） | 约 **5.0 KB**（单条 209–514 字符，均衡，无异常膨胀） |
| 评价 | 健康。description 压缩到位，是本次重构的成功面。 |

### 单个 SKILL.md 触发成本（触发即加载）
| Skill | 行数 | 字节 | 是否超 500 行 |
|---|---|---|---|
| forge-eng | 673 | 25.2 KB | ❌ 超 35% |
| forge-dev | 521 | 21.4 KB | ❌ 超 |
| forge-ship | 471 | 13.3 KB | ✅ 临界 |
| forge-brainstorm | 385 | 17.0 KB | ✅ |
| forge-design | 360 | 15.4 KB | ✅ |
| forge-prd | 354 | 17.9 KB | ✅ |
| forge-doc-release | 352 | 13.2 KB | ✅ |
| forge-qa | 313 | 15.4 KB | ✅ |
| forge-bugfix | 182 | 12.6 KB | ✅ 骨架范本 |
| forge-fupan | 122 | 6.0 KB | ✅ 骨架范本 |

### 典型链路实际加载（骨架 + 会读到的 references）
| 链路 | 累计加载 | 说明 |
|---|---|---|
| **bugfix 单 bug 全程 P0→P8** | 骨架 12.6 + p0-p1 9.1 + p2 6.1 + p3-p5 16.1 + p6-p7 19.7 = **≈ 63.6 KB** | 一次完整修复会读全 4 本手册；渐进披露的收益在于"按阶段先后加载（缓解 context rot）"+"多 bug 会话复用骨架"，而非降低单次总量 |
| **bugfix → qa Mode B 回归** | 上面 63.6 + qa 骨架 15.4 + mode-b 7.5 = **≈ 86.5 KB**（若还写 Playwright 脚本触发 test-dimensions，+64 KB → **≈ 150 KB**） | test-dimensions 64 KB 是链路里最大的单块，且无 TOC |
| **qa Mode A 完整验收** | qa 骨架 15.4 + mode-a 41.1（+ 写脚本时 test-dimensions 64） = **56.5 ~ 120 KB** | Mode A 最重 |
| **dev --full 端到端** | 主上下文 dev 骨架 21.4 + orchestration 8.7 = **≈ 30 KB** | ✅ 设计优秀：design/eng/qa 在**子上下文**执行，不在主上下文堆叠，主链路反而最省——这是全体系最好的上下文工程 |
| **eng 完整模式** | eng 骨架 25.2 + 情境 references（tdd 5.8 / worktree 5.0 / verification 5.0 等，通常 2-3 本）≈ **≈ 40 KB** | 成本主要压在 25 KB 单体骨架上，外移收益尚未兑现 |

**"假瘦身"判定**：
- ✅ 真瘦身：bugfix、fupan 骨架（182/122 行）+ 按阶段 just-in-time 加载，多任务会话复用骨架，缓解 context rot 有实效。
- ⚠️ 半真半假：bugfix 单次完整修复仍会读全 4 本手册（≈64 KB），"总字节"没降多少，降的是"同时在场的峰值"和"重复触发的复用"。这符合渐进披露的本意，但不能宣称"每次都省"。
- ❌ 未瘦身：forge-eng / forge-dev 骨架本身仍是 25/21 KB 单体；forge-qa 的 test-dimensions（64 KB 无 TOC）是纯粹的加载黑洞。

---

## ⑤ 值得表扬的设计（防止只挑刺）

1. **forge-dev 的子上下文编排是全体系最亮的一手**：主上下文只做 orchestration（≈30 KB），design/eng/qa 在独立子上下文跑，从架构上避免了 context rot。这比单纯"拆 reference"高级得多。
2. **bugfix ↔ qa Mode B 契约单一来源做得干净**：参数契约（mode/review_doc/bug_id/worktree/commit/app_url）明确以 `forge-qa/SKILL.md「调用模式」`为唯一出处，forge-bugfix 只引用不复制（p6-p7-acceptance.md:43 明确"此处不重复维护"）。无双写漂移风险。
3. **变量作用域连续性无断层**：抽查 bugfix 的 `$CURRENT_SID / $ACTIVE / $DOC_REVIEWS / $DOC_BACKLOG` 全部在 `p0-p1-session-setup.md` 定义，P3/P5/P6 手册消费——而骨架流程强制 P0-P1 先读，跨文件依赖闭合，没有出现"P4 要用的东西定义在 P2 手册"这类断层。
4. **bugfix 的"Pass 边界 + 新发现分流"是真正的工程纪律**：P7.4 强制先声明"本次 bug 已完成"再问是否入档、同根判定必须举证、AI 顺手重构只准写代码注释不准进 backlog——这套反 scope-creep 设计非常克制且可执行。
5. **description 写法贴合 skill-creator 精神**：普遍 what+when+触发词齐全、够 pushy，还附"铁律"钩子（如 qa 的"console.error 零容忍、不猜端口"），对新会话 AI 的触发和行为约束都强。
6. **forge-qa 的"不猜端口、只用传入 app_url"**：把最常见的 QA 事故（打到旧进程/主仓库）用 dev:status/dev-stack 强制来源 + cwd/PID 身份校验堵死，非常务实。

---

## ⑥ 与他们自评（skill-audit-2026-07.md）的分歧点

> 注：以下基于对自评文档的对照。核心分歧在"重构是否已完成"。

1. **"巨型 SKILL.md 已骨架化" —— 只完成了一部分**。自评的叙事是 bugfix/qa 已骨架化，但**forge-eng（673 行）和 forge-dev（521 行）这两个最大的骨架并未处理**，仍超 500 行硬线。如果自评宣称"骨架化"是全局完成，那是与事实不符；若自评已把 eng/dev 列为待办，则我与其一致，只是想强调这俩才是常驻成本大头，优先级应最高。
2. **"forge-deliver 已退役" —— skill 层退役了，用户文档层没跟上**。总入口 SKILL.md 处理正确，但 README.md 还整段把它当活命令。退役动作只做了一半。
3. **"description 压缩" —— 认同且做得好**，但 forge-doc-policy 的 description 顺带宣传了未建的 audit-project.sh，压缩时没同步能力现状。
4. **对"骨架瘦身"效果的度量口径**：如果自评用"骨架行数"衡量成效，会高估收益；实际链路（bugfix 全程 ≈64 KB、qa Mode A + dimensions 可达 120 KB）说明"按需加载"更多是缓解峰值与 context rot，而非降低单次总量。建议自评补一张"链路级加载账本"而不是只看骨架行数。
5. **清理彻底度**：自评倾向于"重构已收尾"，但残留的旧 `docs/README.md`（do-qa/do-bugfix）、gstack 引用、未建脚本锚点，说明清理还差最后一公里。

---

## 附：本次评审方法与覆盖
- 逐个统计 15 个 SKILL.md + 全部 references/scripts 字节数与行数
- 精读 forge-bugfix（骨架 + 4 本 references 全部）、forge-qa（骨架 + mode-b-regression 全文 + mode-a/test-dimensions 抽样）、forge-fupan（骨架 + schema/template 结构）、forge（总入口全文）、forge-eng/forge-dev（骨架标题级结构）
- 全仓 grep 验证：references 存在性、锚点可达性、forge-deliver/gstack/browse/do-dev 悬空引用、frontmatter 完整性、变量作用域连续性
- 评分尺来源：Anthropic 官方 skill-creator（在线取得成功）
