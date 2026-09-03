# Ebook Maker Skill

AI 电子书制作工作流 — 从调研到成书的一站式 Claude Code Skill。

## 功能

- 深度调研（多 Agent 并行搜索）
- 内容架构（章节大纲 + 用户确认）
- AI 插图生成（即梦 CLI / SeedDream API / Nano Banana 三选一）
- 风格锚定（先出样板确认，再批量生成）
- 统一排版（HTML 模板 + Chrome headless 转 PDF）
- 自动工作报告

## 文件结构

| 文件 | 职责 | 何时修改 |
|------|------|--------|
| `SKILL.md` | 主流程（6 个 Stage） | 改流程逻辑时 |
| `layout.md` | 排版规范（配色、字体、间距、对齐、页码） | 改排版风格时 |
| `illustration.md` | 插图规范（生图工具、风格模板、比例、压缩） | 改插图风格时 |

## 安装

将三个 `.md` 文件放入 Claude Code 的 Skill 目录：

```
~/.claude/skills/ebook-maker/
├── SKILL.md
├── layout.md
└── illustration.md
```

## 使用

在 Claude Code 中说：

```
帮我写一本关于 [主题] 的电子书
```

或更具体：

```
帮我写一本关于 [主题] 的小白手册，加插图，末尾加公众号 [名称]
```

## 插图工具要求（可选）

如果需要 AI 生成插图，需配置以下工具之一：

| 工具 | 前置条件 |
|------|---------|
| 即梦 CLI（默认） | `dreamina` CLI 已登录 |
| SeedDream API | 环境变量 `ARK_API_KEY` |
| Nano Banana | 环境变量 `GEMINI_API_KEY` |

## License

MIT
