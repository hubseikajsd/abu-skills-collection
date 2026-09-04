# abu-skills-collection

> Abu 桌面 AI 助手的完整技能集合（Skills Collection）

本仓库收集并维护 **Abu（阿布）** 桌面 AI 助手可用的全部技能。每个技能以独立子目录的形式存放于 `skills/` 下，包含对应的 `SKILL.md` 说明文件。

## 📦 内容概览

- **技能目录**：`skills/` —— 已收集 **71 个**可用技能（55 个文件，2026-09-03 更新）
- **使用指南（网页版）**：`Abu_Skill_使用指南.html` —— 可视化、支持实时搜索
- **使用指南（Word 版）**：`Abu_Skill_使用指南.docx`
- **三平台同步**：Abu / ZCode / Codex 三平台已同步，数量一致

## 🧭 技能分类

| 分类 | 数量 | 代表技能 |
|------|------|----------|
| 写作 & 创作 | 10 | handoff, chenlin-memoir-writer, autobiographyreconstructor, chinese-novelist, ai-book-creation-assistant, ebook-maker, humanizer-zh, beautiful-article, translate-book, writing-plans |
| 科研 & 学术 | 10 | literature-research, paper-writing, research-paper-writing, paper-verification, paperjury, reviewer-defense, experiment-design, reproduce, research-publishing, launch |
| 开发 & 工程 | 18 | using-superpowers, writing-skills, brainstorming, executing-plans, test-driven-development, systematic-debugging, debug, verification-before-completion, requesting-code-review, receiving-code-review, finishing-a-development-branch, using-git-worktrees, dispatching-parallel-agents, subagent-driven-development, codex-windows-fast-patch, install-github-skill, cli-anything-wps, writing-skills |
| 数据 & 分析 | 3 | dataset-curation, compare, 3-statement-model |
| 知识管理 & Obsidian | 5 | obsidian-cli, obsidian-markdown, obsidian-bases, obsidian-canvas-creator, json-canvas |
| 可视化 & 演示 | 6 | ppt-master, frontend-slides, guizang-ppt-skill, mermaid-visualizer, excalidraw-diagram, educational-html-visualization |
| 文档处理 | 4 | doc-video-duration, doc-video-summary, learning-discussion-analysis, qiaomu-anything-to-notebooklm |
| Web & 信息采集 | 13 | wigolo, wigolo-search, wigolo-fetch, wigolo-crawl, wigolo-extract, wigolo-research, wigolo-cache, wigolo-find-similar, wigolo-diff, wigolo-watch, wigolo-agent, defuddle, file-conversion |
| 教学 & 辅助 | 3 | tutor, tutor-setup, latex-setup |

## 🆕 2026-09-03 新增技能（7 个）

| 技能 | 文件数 | 说明 |
|------|--------|------|
| `handoff` | 1 | 会话交接——两档模式（轻量/完整）+ 项目存档报告，跨 session 上下文传递 |
| `chenlin-memoir-writer` | 10 | 回忆录匠——日记/口述→文学化回忆录，去AI味+记忆来源四级分级防幻觉 |
| `autobiographyreconstructor` | 3 | 自传材料整理师——忠实整理、出处可追溯、角度转换 |
| `chinese-novelist` | 21 | 中文长篇小说分章创作（10-50章，每章3000-5000字） |
| `ai-book-creation-assistant` | 12 | 全流程图书创作（策划→大纲→逐章→文风→出版） |
| `ebook-maker` | 5 | 电子书排版制作 |
| `humanizer-zh` | 3 | 去除中文文本 AI 生成痕迹 |

## 🚀 快速开始

1. **查看技能清单**：打开 `Abu_Skill_使用指南.html`（网页版，含搜索）或 `.docx`（Word 版）
2. **触发方式**：大部分技能会在描述任务时自动触发；也可用 `/+技能名` 显式调用
3. **技能名带 `/`**：内置系统技能；**不带 `/`**：用户安装技能

## ☁️ 核心技能（P0）

- `docx` / `pdf` / `xlsx` / `pptx` — 办公文档全格式处理（内置）
- `file-conversion` — 文件格式互转
- `Abu-Browser` — 浏览器自动化（内置）
- `using-superpowers` — 技能发现机制
- `handoff` — 会话交接，长任务基础设施

## 🤝 贡献与使用

- 每个技能目录内含完整 `SKILL.md`，说明触发条件与使用场景
- 如发现技能缺失或描述有误，欢迎提交 Issue / PR

## 📅 更新记录

- 2026-09-03：新增 7 个写作/回忆录类技能（handoff, chenlin-memoir-writer, autobiographyreconstructor, chinese-novelist, ai-book-creation-assistant, ebook-maker, humanizer-zh），总计 71 个技能，三平台同步
- 2026-08-21：新增 wigolo 系列网络智能工具，完整覆盖全部已装技能
