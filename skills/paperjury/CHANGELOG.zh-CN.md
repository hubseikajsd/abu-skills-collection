[English](CHANGELOG.md) · **中文**

# 更新日志

PaperJury 的所有重要变更都记录在本文件中。

## [1.2.1] - 2026-06-12

对照代码逐条审计了文档里的承诺(和 1.1.0 的 significance floor 修的是同一类「文档写了、代码没有」的脱节)。按分量排序的修复:

### Fixed

- **`ledger.js set` 现在会写入 `--tally`**(按 JSON 解析)。协议要求「把 tally 和 escalated 存到行上」,recall Mode B 的共识过滤读的是 `tally.valid`,但 CLI 的字段白名单把这个 flag 静默丢掉了,改稿前的共识抽查于是可能静默选出零条。其余未知 flag 维持现有的静默忽略行为。
- **`review-engine-v3.md` 里 meaning-audit 的接缝已校正**:workflow 实际返回 `{verdicts, arc}`(文档原写成 `anchor_verdicts`),新增的 SEAM 13 写清了 orchestrator 如何把 `need_audit` 的 anchor id 富集成 workflow 真正消费的完整对象(frozen_text 取自 spine.json,支撑文本取自 anchor-diff)。照旧文档走会跳过冻结锚点的撤销门。
- **auto 的合规守卫已接线**:`submission-compliance.md` 承诺 auto 里超页数或破坏匿名的编辑会被拦,但循环里从没调用过检查器。`auto-mode.md` 和 EDIT-SAFETY 链现在会在 compile-guard 之后、且项目带约束文件时跑 `compliance-check.js --pages <count>`,新出现的 blocker 会撤销并排队。没有约束文件就不启用。
- **振荡检测如实退役**:`AUTO_MODE_DESIGN.md` 多处把它写成已建成的确定性守卫,实际从未实现。现注记为已被 clerk 的 re-raise 归并 + rounds-touched cap + applied-quiescence 取代;`decompose.js` 头注释里那处幻影引用也已删掉。
- 文档与协议的漂移一并清扫:config-template 不再说 auto「DESIGNED, not built」(早已发布),并补上 `mode: auto` + `intensity`;v3 的 persona 默认(运行时 assign-reviewers,lenses 仅作兜底)取代旧默认;`writing-toolkit.md` 改用 v3 的 `valid-fixable` 而非 v2 的 `agreed-to-fix`;`spine.md` 文档对齐 spine.js 真正读取的裸数组 stdin 形状;`ledger-schema.md` 如实重写 `rounds_touched`(由 journal 按需算出,行字段保留不用)和 `drafted_patch`(可选,走模块 API);clerk 头注释不再声称 `re-trial` 行会被结转;`submission-compliance.md` 里的开发机环境事实已移除;「reference style」从它从未实现过的确定性检查清单里挪走;`AUTO_MODE_DESIGN.md` 的状态头记录了 2026-06-05 的端到端运行,并划掉两条早已完成的待建任务;legacy review-panel workflow 的 reviewer/verifier prompt 补上了 hard rule 2 承诺的 ISOLATION 行。
- 公开文案补齐:README 补上 significance floor 和折叠视图、完整的 `ledger.js` CLI(含 `mode`/`floor`)、1.2.0 的脚本(`extract-docx`、`rekey`),以及此前哪儿都没写的 `npm run doctor` 自检;overview.html 不再把已发布的 plugin marketplace 当 TODO 列,也去掉了直接编辑卡里的 LaTeX 字样。

## [1.2.0] - 2026-06-12

Word(.docx)与 Markdown 支持,来自真实用户反馈。LaTeX 路径与 1.1.0 逐字节一致:默认 flag 和缺省选项的行为和以前完全相同。

### Added

- **通过一次性提取支持 Word(.docx)。** 新增零依赖的 `scripts/extract-docx.js`,把 `.docx` 一次性转成位于 `.paper-review/<basename>.md` 的 Markdown 工作副本,外加一份独立的、机器可读的 `extraction-report.json`(逐特征计数 + 字符质量守恒审计,任何被丢弃或降级的内容都会变成一个数字外显,绝不静默丢失;报告永不嵌入工作副本)。原始 Word 文件绝不改动;从提取那一刻起,工作副本就是后续所有规则和 gate 眼里的手稿。失败一律大声报错,带具名的 reason code(legacy `.doc` OLE2、加密 / zip64 / 不支持压缩方法的 zip、UTF-16 的 `document.xml`、缺主part、非 zip)。已存在工作副本时,不加 `--force` 拒绝覆盖;原文件变了(sha256 与 ledger meta 不符)会停下来问,而不是静默重新提取。
- **Markdown 成为一等的多轮格式。** `decompose.js` 的 markdown 模式(从 ATX 标题按计数器生成 section path,识别代码围栏,不剥 `%` 注释,所以「12% over baseline」会原样保留);`compile-guard.js` 把非 `.tex` 工作副本在脚本内路由到 `compiled:null` 加一道 markdown lint(诚实的 UNKNOWN,绝不对 `.md` 跑 latexmk);`compliance-check.js` 对 Markdown 只跑与格式无关的子集,并用明确的 `skipped_checks` 列表标出跳过项(不会冒出「缺章节」的假 major)。
- **轮末 rekey + 段落别名表(两种格式通用)。** 新增 `scripts/rekey.js`,把编辑后 `passage_id` 不再解析得到的活跃 ledger 行重新对齐(优先用 journal 记录的 after-text,否则用行的 `evidence_anchor`),并维护 `.paper-review/passage-aliases.json` 供 `journal.js` 的 cap 函数读取。这样在编辑挪动了首词锚点之后,clerk 的归并键和 rounds-touched cap 都能恢复;对不齐的会以 recall-safe 的方式列出。
- **`apply-patch.js --guard-paragraphs`(可选开启)。** 拒绝 before/after 空行段落数不一致的补丁(段落拆分/合并会引发段落序号级联)。协议规定对 Markdown 工作副本强制启用;`.tex` 默认关闭(LaTeX 行为不变)。
- **入口格式门。** `SKILL.md`、`docs/AGENT-GUIDE.md`、`references/review-engine-v3.md`(新增 step 0)以及 auto 模式的预循环阶段,现在按格式给每份手稿分流:`.tex` 原生、`.md`/`.markdown`/`.txt` 走原生文本路径、`.docx` 一次性提取,其余一律明确报不支持并建议导出。不再有静默降级。

### Fixed

- **漂移边界的文档校正。** `docs/AUTO_MODE_DESIGN.md` 和引擎文档不再暗示某段落的锚点能在编辑后存活:首批稳定词锚点会在段落开头被编辑时改变(且 Markdown 没有 `\label` 那种免疫子集)。现在写出来的机制就是实际机制:rounds-touched cap + 轮末 rekey + 别名表,失败方向 recall-safe。
- **`configs/config-template.md` 的 ledger 默认值**从 `LEDGER.md` 改正为 `LEDGER.json`(JSON 是机器层的 source of truth,`.md` 是渲染视图)。

### Notes

- 已记录在案的否决项(理由见 `docs/AUTO_MODE_DESIGN.md` 的 changelog):提取时注入 HTML 注释锚点、改动锚点方案的 hash 窗口、以及一个 pandoc 提取分支(pandoc 给不出诚实报告,且产出依赖具体机器的工作副本)。你自己把文档转成 `.md` 再直接交进来,仍然完全支持。

## [1.1.0] - 2026-06-12

琐碎问题泛滥的修复(F3),来自真实用户反馈:「阻断 AI 去关注非常细微没有价值的问题」。向后兼容;不动 schema,在设置 mode 之前现有 ledger 渲染结果完全不变。

### Added

- **significance floor,现在落到代码里。** `node scripts/ledger.js floor <ledger.json>` 返回 `{fixable, excluded}`:喂给 drafter 的恰好是 valid-fixable 的 MAJOR 行,任何 valid-fixable 的非 major 都会被排除并报出其 id(只读,绝不静默)。这正是 `references/auto-mode.md` 此前承诺过的那道地板;它现在是 drafter 可修集合的规范来源(review-engine-v3.md step 13 / SEAM 4)。从 polish 升级到 trial 的条目会按升级契约提升为 `significance: major`,这样它之后拿到 valid-fixable 判定时能通过地板。
- **折叠 ledger 视图。** `LEDGER.json` 的 meta 新增可选的 `display_mode`(`show`|`collapse`;缺省即 `show`,逐字节保持旧行为)。在 `collapse` 下,`LEDGER.md` 把 major 仍逐条列在表格里,把 minor 折进一个「Minor digest」:未处理 / 排队中的 minor 每条压成一行(待办决定永不被藏),已了结的 minor 按状态计数,外加一条 never-drop 脚注。纯渲染层 —— 计数、完成门、状态和路由都不受影响,完整明细始终在 `LEDGER.json` 里。新命令:`node scripts/ledger.js mode <ledger.json> <show|collapse>` 和 `node scripts/ledger.js init ... --display <show|collapse>`。auto 模式初始化为折叠;review 模式默认保持平铺表格。

### Notes

- minor / mechanical 修改本身照常进行(polish track 不变);泛滥是在呈现层治理,绝不靠丢弃工作。问题永不被静默丢弃。
- `reason_code: batched-nit` 作为 RESERVED 保留在 schema 里:它当初预设的 composite 打包方案经真实运行数据评估后被否决(见 `docs/AUTO_MODE_DESIGN.md` 的 changelog,2026-06-12,其中也记录了对 2026-06-10 设计辩论存档的发布建议的正式推翻)。

## [1.0.0] - 2026-06-10

首个稳定版,与 Codex 端口的 v1.0 对齐。

### Added

- **软更新提醒。** `scripts/check-update.js` 在 PaperJury 启动时软检查 GitHub 上的稳定 release tag,并打印一条不阻塞的更新提示(plugin 与 clone 两种路径)。GitHub 不可达时保持沉默;用 `PAPERJURY_DISABLE_UPDATE_CHECK=1` 关闭。

### Changed

- **dogfood 样例 PDF 重新放回仓库。** `original_draft.pdf` 和 `revised_draft.pdf` 重新放在 `samples/dogfood/` 里,公开仓库自此自包含;不再作为 release 资产分发。
- **版本提升到 1.0.0**,统一到 plugin manifest、marketplace 列表、package manifest 和 `SKILL.md` frontmatter。`v0.5.0` 的 release 和 tag 被 `v1.0.0` 取代。

## [0.5.0] - 2026-06-05

### Added

- **Claude Code 插件打包。** PaperJury 现在可以作为 Claude Code 插件、从自建 marketplace 安装,与原有的 clone-as-skill 安装方式并存。
  - `.claude-plugin/plugin.json` —— 插件清单。在仓库根声明该 skill(`"skills": ["./"]`,根即 skill),所以 `SKILL.md` 不必移动,纯 skill 安装照常可用。
  - `.claude-plugin/marketplace.json` —— 自建 marketplace,列出这一个插件(`source: "./"`)。
  - 安装:`/plugin marketplace add u7079256/paperjury`,然后 `/plugin install paperjury@u7079256`。

### Notes

- 此变更是纯叠加、非破坏性的:`SKILL.md` 仍在仓库根,照样作为普通 skill 被自动发现,所以现有的 `~/.claude/skills/paperjury` 安装(clone-as-skill)不受影响。
- 插件清单的版本跟随 `SKILL.md` frontmatter 里的 skill 引擎版本。
- 这是首条被记录的 changelog 条目;它记录的是叠加在既有 0.5.0 引擎之上的打包变更,而非完整的引擎历史。
