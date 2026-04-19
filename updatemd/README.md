# Forge Skill 优化记录

按 skill 分类，按时间倒排，记录每次优化的思路、来源和改动。

## 目录结构

```
updatemd/
├── claude-md/          # CLAUDE.md 全局规则更新
├── forge-bugfix/       # Bug 修复工作流优化
├── forge-eng/          # 工程实现流程优化
├── forge-prd/          # 产品需求流程优化
├── forge-qa/           # QA 验收流程优化
├── forge-design/       # 设计流程优化
└── forge-review/       # 代码审查流程优化
```

## 命名规范

`{YYYY-MM-DD}-{主题关键词}.md`

## 内容规范

每篇包含：
- **优化背景**：为什么要改
- **问题诊断**：根因分析
- **方案设计**：具体做了什么
- **改动清单**：涉及哪些文件的哪些位置
- **来源**：调研/复盘/用户反馈
