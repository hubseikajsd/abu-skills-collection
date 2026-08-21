# abu-skills-collection
Abu 桌面 AI 助手的完整技能集合（Skills Collection）
Abu Skill 使用指南
已安装技能完整清单 · 按常用程度分级 · 按功能领域分类
生成时间：2026年08月21日
目录
一、P0 核心（共 7 个技能）
二、P1 常用（共 12 个技能）
三、P2 中频（共 30 个技能）
四、P3 低频（共 36 个技能）
六、P5 专业（共 11 个技能）
一、使用说明
大部分 Skill 会在你描述任务时自动触发，无需手动调用。如果想显式调用某个技能，可以使用 /+技能名的方式。技能名前带 / 的为内置技能，不带 / 的为用户安装技能。
二、优先级彩色图例
【P0 核心】  日常办公最高频使用，几乎每天都会触发
【P1 常用】  文档增强与内容创作，每周多次使用
【P2 中频】  项目管理与开发流程，按需触发
【P3 低频】  学术研究与专业工具，特定场景触发
【P5 专业】  高级开发与专业领域，极少使用
三、P0 核心（共 7 个技能）
▶ 文档处理
  『docx』  【文档处理】  创建、读取、编辑 Word 文档（.docx），生成带格式的报告、备忘录、信件等
    触发：提到 Word 文档、.docx 文件、生成带格式报告
  『pdf』  【文档处理】  PDF 文件处理：读取、提取文本/表格、合并、拆分、旋转、加水印、创建、填表、加密解密、OCR
    触发：处理 PDF 文件、提到 .pdf 文件
  『xlsx』  【文档处理】  Excel/CSV/TSV 文件处理：打开、读取、编辑、创建电子表格、清理表格数据
    触发：处理 Excel/CSV 文件、创建电子表格
  『pptx』  【文档处理】  创建、读取、编辑演示文稿（PPT/PPTX），处理幻灯片、演示文稿
    触发：提到 PPT、幻灯片、演示文稿、presentation
  『file-conversion』  【文档处理】  文件格式转换：PDF→Word、HEIC→JPG、MP4→MP3、CSV→JSON、EPUB→MOBI 等
    触发：要求转换文件格式
▶ 浏览器与自动化
  『Abu-Browser』  【浏览器与自动化】  操作用户真实的 Chrome 浏览器：点击、填写、截图、提取数据、填写表单、浏览器自动化
    触发：要求操作浏览器、抓取网页内容、网页截图、填写表单
▶ 技能系统
  『using-superpowers』  【技能系统】  每次对话开始时自动调用，建立技能发现与使用机制
    触发：每次新对话开始时自动触发
四、P1 常用（共 12 个技能）
▶ 文档处理
  『doc-video-duration』  【文档处理】  扫描 Word 文档中所有视频链接（B站/微信视频号），通过 B站 API 查询真实时长并替换占位时长
    触发：为文档中视频核对/添加/替换时长
  『doc-video-summary』  【文档处理】  扫描 Word 文档中所有视频材料，逐一检索视频内容概括并追加到每个视频条目后
    触发：为文档中视频补充/生成内容概括、摘要
  『translate-book』  【文档处理】  整本书籍翻译（PDF/DOCX/EPUB），支持多语言、分章处理、术语表管理
    触发：要求翻译整本书籍、外文文献
  『learning-discussion-analysis』  【文档处理】  根据学习文档中的讨论问题，结合文档内容与网络调研，逐题详细分析，生成带格式的 Word 文档
    触发：回答/分析学习文档中的讨论问题、思考题
  『doc-coauthoring』  【文档处理】  引导用户通过结构化工作流协作撰写文档
    触发：需要协作撰写文档
▶ 内容创作与可视化
  『beautiful-article』  【内容创作与可视化】  把素材（网页/PDF/DOCX/Markdown/文本/截图）编辑设计成美丽的、可离线打开的单文件 HTML 网页文章
    触发：要求把内容做成美观的文章、HTML 网页
  『educational-html-visualization』  【内容创作与可视化】  将理论/教材/学习内容转化为结构清晰、视觉友好的教育型 HTML 可视化文件
    触发：要求将理论/概念做成 HTML 图、可视化、教学示意图
  『frontend-slides』  【内容创作与可视化】  从零创建或从 PowerPoint 文件转换，生成动画丰富的 HTML 演示文稿
    触发：要求创建 HTML 演示文稿、网页 PPT
  『excalidraw-diagram』  【内容创作与可视化】  将文字内容生成 Excalidraw 手绘风格图表，支持 Obsidian/标准/动画三种模式
    触发：要求生成 Excalidraw 图、手绘风格图表
  『mermaid-visualizer』  【内容创作与可视化】  将文字内容转换为专业 Mermaid 图表（流程图/时序图/状态图/甘特图等）
    触发：要求生成 Mermaid 图表、流程图、时序图
▶ 浏览器与自动化
  『schedule』  【浏览器与自动化】  创建和管理定时任务，设置定期自动执行的操作（每天/每周/每小时）
    触发：要求定时、定期执行某个操作
  『cn-quote-protector』  【浏览器与自动化】  保护 Python 脚本中的中文引号，自动替换为 Unicode 转义序列，防止语法错误
    触发：写入包含中文引号的 Python 脚本
五、P2 中频（共 30 个技能）
▶ 内容创作与可视化
  『guizang-ppt-skill』  【内容创作与可视化】  生成横向翻页网页 PPT（单 HTML 文件），含 WebGL 背景、章节幕封、数据大字报、图片网格等模板
    触发：要求生成网页 PPT、横向翻页演示
  『ppt-master』  【内容创作与可视化】  AI 驱动的演示文稿生成工作流，生成可编辑的 PPTX，创建可复用的品牌/风格/布局模板
    触发：要求生成 PPTX 演示文稿
  『qiaomu-anything-to-notebooklm』  【内容创作与可视化】  多源内容智能处理器：微信公众号、网页、YouTube、播客、PDF、Markdown 等，自动上传到 NotebookLM 生成播客/PPT/思维导图
    触发：要求将内容上传到 NotebookLM
  『defuddle』  【内容创作与可视化】  使用 Defuddle CLI 从网页中提取干净的 Markdown 内容，去除杂乱导航和广告
    触发：要求提取网页正文内容
  『internal-comms』  【内容创作与可视化】  帮助撰写各类内部通信文档，使用规范格式
    触发：要求撰写内部通信
▶ 浏览器与自动化
  『trigger』  【浏览器与自动化】  创建和管理触发器，设置事件驱动的自动化任务，监听文件/目录变化
    触发：要求事件驱动、监听文件变化自动执行
  『alert-sop』  【浏览器与自动化】  自动分析告警信息，按 SOP 排查问题并生成处理报告
    触发：收到告警消息需要排查处理
▶ 项目管理与脚手架
  『office-project-scaffold』  【项目管理与脚手架】  为自动化办公项目初始化标准目录结构（任务看板+需求/输入/工作区/产出/已交付/归档），按任务规模分级
    触发：要求新建办公项目目录、初始化项目结构
  『research-project-scaffold』  【项目管理与脚手架】  为科研/AI 代码项目初始化标准目录结构（文档/数据/代码/模型/图表/日志）
    触发：要求新建科研项目目录、初始化科研项目结构
  『init』  【项目管理与脚手架】  初始化工作区规则文件 (.abu/ABU.md)，分析项目结构生成项目规则模板
    触发：要求初始化工作区规则
  『beijing-edu-job-collector』  【项目管理与脚手架】  采集北京教育行业校招及社招岗位，从 BOSS直聘/猎聘/智联招聘/人社局等渠道搜索，按薪资过滤输出清单
    触发：要求查找/采集北京教育行业招聘信息
▶ 开发流程
  『brainstorming』  【开发流程】  创建功能、构建组件、添加函数前的创意脑爆，必须在任何创意工作之前使用
    触发：创建功能/构建组件前的脑爆
  『writing-plans』  【开发流程】  有规格/需求时，在写代码前编写多步骤实施计划
    触发：有规格需求，需要编写实施计划
  『executing-plans』  【开发流程】  在单独会话中执行已编写好的实施计划，含审查检查点
    触发：有实施计划需要执行
  『verification-before-completion』  【开发流程】  在声称工作完成/修复/通过之前，验证工作确实满足要求
    触发：即将声称工作完成时
  『dispatching-parallel-agents』  【开发流程】  面对 2+ 个独立任务时，分派并行代理同时处理
    触发：有多个独立任务需要并行处理
  『subagent-driven-development』  【开发流程】  在当前会话中执行含独立任务的实施计划
    触发：执行含独立任务的计划
  『test-driven-development』  【开发流程】  实现功能或修复前先写测试代码的 TDD 方法
    触发：实现功能/修复 bug 前的测试
  『debug』  【开发流程】  ML 实验失败时的系统化诊断：先查证据（进程/日志/GPU/检查点），再提出假设
    触发：遇到 ML 实验失败、bug、异常行为
  『systematic-debugging』  【开发流程】  遇到 bug、测试失败或意外行为时的系统化调试方法
    触发：遇到 bug/测试失败/意外行为
  『using-git-worktrees』  【开发流程】  开始需要与当前工作区隔离的功能开发时，使用 Git worktree
    触发：功能开发需要隔离工作区
  『finishing-a-development-branch』  【开发流程】  实现完成、测试通过后，决定如何集成工作到主分支
    触发：开发分支完成，需要集成
  『requesting-code-review』  【开发流程】  完成任务、实现主要功能或合并前，验证工作满足要求
    触发：完成任务后请求代码审查
  『receiving-code-review』  【开发流程】  收到代码审查反馈后，在实施建议之前使用
    触发：收到代码审查反馈
  『webapp-testing』  【开发流程】  使用 Playwright 与本地 Web 应用交互和测试
    触发：需要测试本地 Web 应用
▶ 专业工具集成
  『cli-anything-wps』  【专业工具集成】  WPS Office CLI — JSON 数据驱动 PPT 自动生成 + 命令行操控 WPS 文字/表格/演示文稿
    触发：要求操控 WPS Office
▶ 技能系统与元工具
  『skill-creator』  【技能系统与元工具】  创建、编辑、优化和测试 skills
    触发：要求创建/编辑/测试某个具体 skill
  『writing-skills』  【技能系统与元工具】  创建新技能、编辑已有技能、验证技能可用性
    触发：要求编写/编辑 skill
  『install-github-skill』  【技能系统与元工具】  从 GitHub 仓库安装 Skill 到 Abu 工具箱的完整流程
    触发：要求从 GitHub 安装 skill
  『reflect』  【技能系统与元工具】  复盘当前对话——回顾任务过程、总结经验教训、主动沉淀可复用的 skill
    触发：要求复盘/反思/回顾本次对话
六、P3 低频（共 36 个技能）
▶ 网络智能工具
  『wigolo』  【网络智能工具】  Local-first 网页智能套件：统一入口，用于所有网页搜索、抓取、提取操作
    触发：要求搜索/抓取/获取网页内容
  『wigolo-search』  【网络智能工具】  本地优先网页搜索，ML 重排序、多查询数组、域名界定、短语精确匹配
    触发：要求搜索网页、精确短语搜索
  『wigolo-fetch』  【网络智能工具】  本地优先 URL 抓取：干净 Markdown 输出、结构化元数据、JS 渲染 SPA 支持
    触发：要求抓取/获取某个网页 URL 内容
  『wigolo-extract』  【网络智能工具】  本地优先结构化提取：从任意网页提取表格、定义列表、键值对、JSON
    触发：要求从网页提取表格/结构化数据
  『wigolo-crawl』  【网络智能工具】  本地优先多页面抓取，支持 sitemap、BFS、DFS、URL-map 策略
    触发：要求批量抓取/爬取多个网页
  『wigolo-cache』  【网络智能工具】  本地优先知识缓存：对 wigolo 已见过的每个页面做全文本+混合语义搜索
    触发：要求搜索已缓存/已查看过的页面
  『wigolo-research』  【网络智能工具】  本地优先多步调研：问题拆解、并行搜索、结构化简报交付
    触发：要求做多步骤网络调研/研究
  『wigolo-agent』  【网络智能工具】  跨来源自主数据收集：从自然语言需求规划搜索查询和 URL
    触发：要求自主收集多个来源的数据
  『wigolo-diff』  【网络智能工具】  对比页面的两个版本看差异：实时 URL 对照缓存副本
    触发：要求对比网页前后差异/变化
  『wigolo-find-similar』  【网络智能工具】  混合语义发现：融合嵌入+关键词+实时网络搜索的三路查找
    触发：要求找相似页面/相关内容
  『wigolo-watch』  【网络智能工具】  监控页面随时间变化：对一个或多个 URL 创建惰性监听任务
    触发：要求监控网页变化/定时检查页面
▶ 学术研究与知识管理
  『research-paper-writing』  【学术研究与知识管理】  提升 ML/CV/NLP 风格学术论文的写作质量，改善段落结构和行文
    触发：要求改进学术论文写作
  『paper-writing』  【学术研究与知识管理】  学术论文全流程写作：选题、摘要、方法论、实验、结论，支持 LaTeX/Markdown 输出
    触发：要求撰写学术论文、论文写作
  『paper-verification』  【学术研究与知识管理】  验证论文声明与代码/数据的一致性，审计数字准确性
    触发：要求核实论文声明、审计论文数据
  『paperjury』  【学术研究与知识管理】  CS 会议论文（CVPR/ACL/NeurIPS 等）的审稿与编辑：直接编辑模式、对抗式审稿模式、自动模式
    触发：要求审稿/评审/编辑 CS 会议论文
  『literature-research』  【学术研究与知识管理】  系统性文献调研：领域综述、文献缺口识别、相关工作梳理
    触发：要求文献调研、梳理领域文献
  『experiment-design』  【学术研究与知识管理】  实验设计：消融实验、基线对比、参数敏感性分析的结构化设计
    触发：要求设计实验、消融实验
  『reproduce』  【学术研究与知识管理】  从 arXiv URL 到完整复现：代码获取、数据准备、冒烟测试、复现实验
    触发：要求复现论文、跑通论文代码
  『compare』  【学术研究与知识管理】  同阶段训练任务对比（wandb/neptune/tensorboard/mlflow），对齐到学生当前步数
    触发：要求对比训练任务、实验对比
  『dataset-curation』  【学术研究与知识管理】  数据集分析、偏差检测、分层采样、公平性评估
    触发：要求分析数据集偏差、创建分层样本
  『research-publishing』  【学术研究与知识管理】  论文投稿发表全流程：开源代码准备、可复现性保障、论文发表
    触发：要求准备论文开源代码、发表论文
  『reviewer-defense』  【学术研究与知识管理】  预判审稿人问题、选择最强消融实验、准备答辩材料
    触发：要求准备审稿答辩、预判审稿人问题
  『latex-setup』  【学术研究与知识管理】  LaTeX 环境搭建与排错：biber/bibtex 选择、模板配置、编译问题排查
    触发：要求搭建/排错 LaTeX 环境
  『launch』  【学术研究与知识管理】  ML 训练任务预飞行检查清单：配置 diff、任务命名、路径验证、监控设置、重启清理
    触发：要求启动/启动 ML 训练任务
  『tutor』  【学术研究与知识管理】  知识辅导与测验：根据 Obsidian 笔记生成测验题，交互式学习效果检验
    触发：要求知识测验、学习检验
  『tutor-setup』  【学术研究与知识管理】  Obsidian 学习库初始化：代码库/文档转知识管理，含质量检查清单
    触发：要求初始化学习库、导入知识源
  『3-statement-model』  【学术研究与知识管理】  完成和填充三表财务模型模板（利润表、资产负债表、现金流量表）
    触发：要求填写/完成财务模型模板
  『obsidian-cli』  【学术研究与知识管理】  使用 Obsidian CLI 读取、创建、搜索和管理笔记、任务
    触发：要求操作 Obsidian 笔记库
  『obsidian-bases』  【学术研究与知识管理】  创建和编辑 Obsidian Bases（.base 文件），含视图、过滤器、公式和摘要
    触发：要求创建 Obsidian Base 视图
  『obsidian-markdown』  【学术研究与知识管理】  创建和编辑 Obsidian 风格 Markdown，含 wikilinks、嵌入、标注、属性等
    触发：要求编辑 Obsidian Markdown
  『obsidian-canvas-creator』  【学术研究与知识管理】  从文字内容创建 Obsidian Canvas 文件，支持思维导图和自由布局
    触发：要求创建 Canvas 画布、思维导图
  『json-canvas』  【学术研究与知识管理】  创建和编辑 JSON Canvas 文件（.canvas），含节点、边、组和连接
    触发：要求创建 JSON Canvas
▶ 专业工具集成
  『cli-anything-photoshop』  【专业工具集成】  通过 COM 自动化操控 Adobe Photoshop：项目管理、图层操作、选区控制、文字编辑、图像调整、多格式导出
    触发：要求操控 Photoshop
  『cli-anything-zotero』  【专业工具集成】  Zotero CLI — 文献管理、引用、学术搜索，通过 COM 自动化操控 Zotero 本地数据
    触发：要求操控 Zotero
  『codex-windows-fast-patch』  【专业工具集成】  修复和重新应用 Windows Codex Desktop 升级后的自定义配置
    触发：Codex Desktop 需要修复
  『mcp-builder』  【专业工具集成】  创建高质量 MCP（Model Context Protocol）服务器的指南，使 LLM 能与工具和数据源互动
    触发：要求创建 MCP 服务器
七、P5 专业（共 11 个技能）
▶ 高级开发与设计
  『frontend-design』  【高级开发与设计】  创建独特的、生产级的前端界面，具有高设计质量
    触发：要求创建前端界面
  『web-artifacts-builder』  【高级开发与设计】  使用现代前端技术创建精致的多组件 HTML 件
    触发：要求创建 HTML 件
  『claude-api』  【高级开发与设计】  使用 Claude API 或 Anthropic SDK 构建应用
    触发：代码导入 anthropic SDK
  『algorithmic-art』  【高级开发与设计】  使用 p5.js 创建带种子随机性和交互参数探索的算法艺术
    触发：要求创建算法艺术
  『canvas-design』  【高级开发与设计】  使用设计哲学在 .png 和 .pdf 文档中创建美丽的视觉艺术
    触发：要求创建视觉艺术作品
  『brand-guidelines』  【高级开发与设计】  应用 Anthropic 官方品牌颜色和排版到各类作品
    触发：要求应用品牌指南
  『theme-factory』  【高级开发与设计】  为幻灯片、文档、报告、HTML 等作品应用主题样式
    触发：要求为作品应用主题
  『slack-gif-creator』  【高级开发与设计】  创建为 Slack 优化的动画 GIF
    触发：要求创建 Slack GIF
  『gpt-image-2』  【高级开发与设计】  面向 GPT Image 2 的图像生成/编辑：Garden 本地出图、Host-Native 委托出图、Advisor 纯提示词顾问
    触发：要求生成/编辑图像
▶ 数据与 API 集成
  『preset-cortex-agents』  【数据与 API 集成】  使用 Snowflake Cortex Agent REST 和 SQL API 管理和运行 agents
    触发：要求使用 Snowflake Cortex Agents
  『preset-sql-execution』  【数据与 API 集成】  运行或路由 SQL Lab 执行、结果检索、导出、查询停止等
    触发：要求执行 SQL 查询
附：统计摘要
技能总数：96 个
优先级分布： P0 核心(7) /  P1 常用(12) /  P2 中频(30) /  P3 低频(36) /  P5 专业(11) / 
