---
status: live
type: plan
module: global
last_updated: 2026-07-04
---

# Forge 优化方案确认单

> 用法：每个决策项（D-xx）我已填好"改什么 / 为什么 / 怎么改 / 风险与对策"，**你只填最后一行"你的决定"**：
> ✅ 同意 / ❌ 不做 / ✏️ 修改（写一句你的意见）。
> 全部确认后按顺序动工，每完成一项都有独立 commit 可回滚。
> **2026-07-04 用户对话整体放行（"继续"）**；D-08/D-09 仍按约定另出细案再动手。
> 依据：`docs/skill-audit-2026-07.md`（P-01~P-31 问题清单）。P0 阶段已完成不在此单。

## 总原则（先确认这条）

**D-00 本轮只做减法和解耦，不加新功能**（唯一例外：兑现已规划未实现的 init-project.sh）。
验收标准：新项目从零跑通一个小需求，步数和上下文消耗可量化对比。
- 你的决定：

---

## 第一组：巨型 skill 瘦身（P1 核心）

瘦身方法统一为"骨架 + 按需加载"：SKILL.md 正文只留**每次必读**的内容（流程总览、铁律、各阶段一句话职责 + 何时读哪份细则），**阶段细则/代码模板/报告格式**搬进 `references/`，进到哪个阶段才读哪份。**只搬家不删规则**——每段搬走的内容在骨架留一行指针。

### D-01 forge-qa 瘦身（64KB → 骨架约 12-15KB）✅ 已执行 0422e06（实际 15.4KB）

**切分方案**：
| 去向 | 内容 | 现占体积（约） |
|---|---|---|
| 骨架保留 | 调用模式判断 + Mode B 参数契约、三层架构图、8 条铁律、流程总览、User Gate 原则、出口 | 12-15KB |
| references/mode-b-regression.md | Mode B 单 bug 回归全流程 + BF 报告回填格式（调用方只有 bugfix，Mode A 用户永远用不到这 400 行） | ~12KB |
| references/execution-engines.md | 第 5 步执行细则：qa-runner 模板、分阶段快速失败、browser-use/Playwright/纯代码引擎选择 | ~15KB |
| references/test-spec-guide.md | 第 2.5 步 test-spec 生成细则 + 断言深度规则详解 | ~10KB |
| 并入已有 references/qa-template.md | 验收计划模板、报告格式、健康评分表 | ~10KB |

**风险与对策**：AI 进入某阶段忘读细则 → 骨架每个阶段末尾写死"执行本步前必读 references/xxx.md"；改完跑一次真实 Mode A 冒烟验证。
- 你的决定：

### D-02 forge-bugfix 瘦身（63KB → 骨架约 15KB）✅ 已执行 1a0f65b（实际 12.6KB；references 归并为 4 份连续切分，内容一致）

**切分方案**：
| 去向 | 内容 |
|---|---|
| 骨架保留 | 设计哲学、9 条铁律、P0-P8 流程总览 + 红线、每个 P 阶段的入口/出口/一句话职责 |
| references/p0-environment.md | 150 行环境探测脚本 + active.md 并行协调细则 |
| references/p2-scoping-backlog.md | 范围推荐、backlog 捞取/写入操作细则 |
| references/p3-p5-fix-loop.md | worktree 创建、复现、根因/5 Whys、TDD 修复细则 |
| references/p6-p7-acceptance.md | QA 调用、人工验收、Pass/Fail/新发现分流、边界确认细则 |
| references/report-lifecycle.md | BF 报告创建/更新/归档的字段和格式 |

**附带治理**：Mode B 参数契约目前 bugfix/qa 两边各写一份（P-14），改为 qa 侧为唯一出处，bugfix 只写"契约见 forge-qa"。
**风险与对策**：同 D-01；改完在 info2action 用下一个真实 bug 走一遍 P0-P8 实战验证。
- 你的决定：

### D-03 中型 skill 瘦身（design 30K / dev 28K / eng 28K / brainstorm 27.5K / prd 26K）✅ 已执行（5 个独立 commit）

各自把最大的内嵌块外移（brainstorm 的思考文档模板约 300 行、design 的审计细则、dev 的模式/状态管理细则、prd 的诊断题库、eng 的端口契约和测试框架检测细则），目标各回到 12-18KB。fupan 不动（等 E2 重设计一起做）；deliver 不动（等 E1 合并决策）。
**风险与对策**：同上，逐个提交、逐个自检引用完整性。
- 你的决定：

### D-04 15 个 description 压缩到 2-4 行 ✅ 已执行 0d92b74

description 常驻你**每一个会话**的上下文（包括写文章、聊生活）。现在 bugfix/qa 的 description 是小作文。压缩原则：保留"是什么 + 什么时候触发"，砍掉流程复述和环境细节（那些正文里有）。压缩后的完整清单会先贴给你过目再写入。
**风险与对策**：触发词减少可能让 skill 不被唤起 → 触发词全部保留，只砍流程描述。
- 你的决定：

### D-05 工作区 CLAUDE.md 的 forge 段收缩（约 200 行 → 约 60 行）✅ 已执行（Forge 段 135 行→56 行，全文 206→127 行）

R1-R11 大量复述 skill 内部规则（R11 几乎是 bugfix P6-P7.5 的复印件），已经漂移过一次。收缩为：状态→行动路由表 + 每条铁律一行摘要 + "细则见对应 skill"指针。文档治理段保留（它本来就是指针式的）。
**风险与对策**：CLAUDE.md 是兜底防线，怕 skill 没加载时失去约束 → 保留每条铁律的"一行版"，只删展开解释。改完先跑一周观察有没有行为退化再删备份。
- 你的决定：

---

## 第二组：降门槛（P2）

### D-06 兑现 init-project.sh → 新项目一键接入 ✅ 已执行（幂等实测两遍通过）

doc-policy 里规划了 3 个月未实现的脚本，补上：在新项目根跑一次，创建 docs/ 骨架 + .features/_registry.md + docs/bugfix/backlog.md + 从模板生成项目 CLAUDE.md 引用段 + .gitignore 规则。这是"唯一允许的加法"（兑现旧承诺）。
- 你的决定：

### D-07 /forge 决策树加轻量车道 ✅ 已执行（轻量车道置顶 + 空项目导向脚手架；触发词"继续"已随 D-04 删除）

在总入口决策树顶部加一条："改动预估 < 半小时且不碰数据结构 → 建议直接 forge-eng 轻量模式或 forge-bugfix，跳过 PRD/设计仪式"。同时把触发词里过宽的"继续"删掉（P-03）。
- 你的决定：

---

## 第三组：结构性调整（阶段 4，每项动手前还会单独出细案）

### D-08 dev/deliver 合并（方向已按你的答复定：保 dev）✅ 细案确认后已执行

forge-dev 吸收 deliver 的 Phase 5-7（发布/文档/验收编排），deliver 退役进 _archive；状态目录统一为 `.forge/`（顺便消灭 `.do-dev/` 这个白名单反模式命名）。本项做完 forge-dev 会变成唯一编排器。
- 你的决定（本项只确认方向，细案另出）：

### D-09 fupan 重设计（按你的反馈立项）✅ 全部完成（含 Workbench 阅览器改造，UI 经确认）

你的原话："每次都开但效果不太好，复盘不要这么公式化，核心目的是帮我提升自己的能力。"
重设计原则草案：① 产出以"你的能力增量"为唯一 KPI，不再追求文档完整性；② 砍掉固定章节模板，改为每次只聚焦 1-3 个真正值得学的点；③ Workbench 降为可选（默认不启动）；④ 先精读 gstack 最新版 /learn 和 /retro 找参考。细案会先和你 brainstorm 一轮再动手。
- 你的决定（本项只确认方向）：

### D-10 forge-qa 引擎清单去掉 gstack/browse（P-31）✅ 已执行（qa+bugfix 两侧）

该引擎本地已丢失，引用悬空。删掉这个选项，保留 browser-use / Playwright / 纯代码三档。若未来想要再从 garrytan/gstack 重装（那是 5 分钟的事）。
- 你的决定：

### D-11 上游增量融合批次（瘦身完成后执行）✅ 已执行（数据域扩展暂缓另立项）

按审计第 5 节：Superpowers v5 的对抗性 spec 审查清单（进 forge-prd）+ 子代理模型路由（进 forge-dev，省钱）；frontend-design 最新反 AI 模板清单对照更新；ui-ux-pro-max 数据 CSV 增量同步。原则不变：引用不内嵌。
- 你的决定：

---

## 第四组：小修（已在 P0 顺手完成，此处备案无需确认）

- ✅ qa "7 维度 vs 10 维度"矛盾 → 统一为 10（已核实 reference 文件）
- ✅ design-impl 死引用 cn-qa-design 删除
- ✅ doc-release 过时模型署名去除
- ✅ review/doc-release 兼容 TODO.md/TODOS.md 双命名
- ✅ 技能手册 skills-reference.md 全量重写（补 3 个缺失 + 清除旧名残留）

## 执行顺序（全部确认后）

```
D-04 description 压缩（1 次提交，立刻全会话受益）
→ D-01 qa 瘦身 → D-02 bugfix 瘦身（含 P-14 契约单源化）→ D-10 顺手做
→ D-03 中型瘦身（5 个，逐个提交）
→ D-05 CLAUDE.md 收缩
→ D-06 init 脚手架 → D-07 轻量车道 → 全新项目端到端验收
→ D-08 / D-09 各自出细案 → D-11 增量融合
```

每步完成标准：字节数对比 + 引用完整性检查（grep 所有 references 链接存在）+ 对应 skill 真实冒烟一次。
