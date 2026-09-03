# 状态管理方案（State Management）

本 Skill 通过工作区内的项目文件实现跨会话的长项目管理。每本书一个独立目录，互不干扰；作者偏好一旦确认即持久化，跨会话生效。

## 7.1 项目目录结构

```
<workspace>/books/<book-slug>/
├── 00_BOOK_PROJECT.md      # 主控文件：元数据 + 进度表 + 配置
├── 01_PLANNING.md          # 图书策划方案（阶段1产出）
├── 02_OUTLINE.md           # 完整图书大纲（阶段2产出）
├── TERMS.md                # 术语表 + 核心观点 + 来源追踪
├── NOTES.md                # 作者偏好 + 修订记录 + 待办
├── chapters/
│   ├── 01_<slug>.md        # 第1章正文
│   ├── 02_<slug>.md        # 第2章正文
│   └── ...
└── SOURCES.md              # （严格模式可选）来源追踪表
```

## 7.2 主控文件字段（00_BOOK_PROJECT.md）

```markdown
# 项目：<书名>
- book_slug: <book-slug>
- status: planning | outlining | writing | editing | publishing
- created: YYYY-MM-DD
- updated: YYYY-MM-DD

## 配置（启动确认后写入，勿随意改）
- style: <锁定文风>
- style_variants: <局部变体，可选>
- fact_check_mode: off | basic | professional | strict
- target_readers: <读者画像>
- core_value: <核心价值一句话>

## 进度表
| 章 | 标题 | 状态 | 更新日期 |
|---|---|---|---|
| 01 | ... | 未完成 | |
| 02 | ... | 写作中 | |
```

## 7.3 术语与核心观点（TERMS.md）

```markdown
# 术语与核心观点
## 术语表（概念 → 统一用词 → 定义）
- 概念A → 统一用词「A」→ 定义一句话
## 核心观点（书的主张，新增须作者确认）
- 观点1：...
## 来源追踪（严格模式）
- [来源1] 作者/出处/年份/链接占位
```

## 7.4 一致性自检清单（每次生成正文后执行）

1. 术语：本段用词是否与 TERMS.md 术语表一致？同一概念是否混用多词？
2. 观点：新论点是否与已记录核心观点冲突或被其覆盖？
3. 重复：是否与已完成章节出现明显重复或换皮重写？
4. 衔接：章首是否回扣上文、章末是否铺垫下文？
5. 风格：是否偏离 `00_BOOK_PROJECT.md` 锁定的文风？（偏离仅提示不擅改）
6. 事实：若 fact_check_mode 为 professional/strict，是否给出核查/来源提示？

发现问题 → 写入「一致性备忘」提示作者，不直接改动正文。

## 7.5 续接项目流程

启动时若项目目录已存在：
1. 读取 `00_BOOK_PROJECT.md` 恢复配置与进度。
2. 读取 `TERMS.md` / `NOTES.md` 恢复术语、观点、偏好。
3. 向作者复述：「当前进度：第 X 章写作中 / 已确认至大纲；风格=…；事实模式=…」，再继续。
4. 任何配置变更（风格、事实模式、读者）须作者确认后更新状态文件。
