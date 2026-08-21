---
name: learning-discussion-analysis
description: 根据学习文档中的讨论问题，结合文档内容与网络调研，以实事求是原则逐题详细分析，生成带格式的Word文档（含答案+引用链接）。适用场景：学习记录中的重点讨论问题、研讨材料中的思考题、考核性质的问题回答。
trigger: 用户要求回答/分析/解答学习文档中的讨论问题、思考题、研讨题，或要求将问题答案整理成Word文档输出
---

# 学习讨论问题分析工作流

## 核心原则
- **实事求是**：答案基于文档原文和权威公开资料，不自行编造内容
- **有据可查**：每个关键论断尽量附带来源链接（企业官网、学术论文、政策文件等）
- **逐题分析**：每题独立作答，不跳过、不合并
- **格式规范**：最终输出为带格式的Word文档，含标题层级、表格对比、引用汇总

## 触发条件
用户要求回答/分析/解答学习文档中的讨论问题，且问题需要：
1. 概念定义（如"什么是智能体？什么是AGI？"）
2. 现状调查（如"AI在各行各业的应用处于什么阶段？"）
3. 趋势分析（如"哪些岗位最可能被替代？"）
4. 理论探讨（如"AI是否正在逼近人的意识？"）

## 工作流步骤

### Step 1：读取文档，提取问题
- 读取用户指定的学习文档（.docx/.txt等）
- 定位"讨论问题"或"思考题"部分
- 提取所有问题，保持原样，不修改措辞
- 如有多份文档，全部读取后合并问题列表

### Step 2：并行调研（按需）
- 判断问题类型，将问题分组：
  - **概念定义类**（如"什么是智能体/具身智能/AGI"）：搜索权威定义（Anthropic/OpenAI/企业官网/学术论文）
  - **现状调查类**（如"产业落地阶段"、"岗位替代进展"）：搜索最新数据、案例、报道
  - **理论探讨类**（如"AI意识"、"无用阶级"）：搜索学术观点、原著引文、批评与反驳
- 使用 `delegate_to_agent` 设置 `async: true`，分组并行调研
- 每组调研要求：包含来源URL、最新数据、不同观点对比

### Step 3：综合整理答案
- 逐题按照以下结构组织答案：
  - **概念定义**：先给出清晰定义，如有不同学派观点则并列呈现
  - **对比表格**：适合对比的内容（如ChatBot vs Agent、各行业落地阶段）用表格呈现
  - **数据支撑**：关键论断附数据（使用"据XX数据/报告/来源"）
  - **辩证分析**：有争议的问题保留不同观点，说明争议所在
  - **个人思考框架**：留出学习者自我定位的空间

### Step 4：生成Word文档

#### 4.1 内容组织方式（重要）

**方案A（推荐）：长文本内容用"数据文件 + 渲染脚本"两件套**

对于10+问题、每题多段长答案的情况，不要把所有内容塞进一个JSON文件。推荐做法：

1. **写一个Python数据文件（如 `_qa_data.py`）**，用Python原生字符串定义所有内容
   - 每个问题是字典：`title`（标题）、`content`（可选引言）、`points`（要点列表）
   - 使用Python原生字符串，中文引号直接写，无需转义
   - Python字符串对中文引号（""）天然友好，不像JSON会解析失败
2. **写一个渲染脚本（如 `_gen_word.py`）**，import数据文件，用python-docx逐项渲染
3. 渲染脚本负责：标题层级、字体（黑体/宋体）、字号、颜色、行距、首行缩进、目录TOC

**方案B（仅适用短内容）：JSON文件**
- 仅适用于内容较短的场景（<=5个简单问题）
- **注意**：JSON中中文引号会导致解析错误，必须用Unicode转义 `\u201c` `\u201d` 或英文直引号替代
- 推荐用 `python3 -c "import json; json.dump(data, f, ensure_ascii=False, indent=2)"` 生成，避免手动写JSON

#### 4.2 Python脚本中的编码与输出（必做）

在生成脚本开头必须加：
```python
# -*- coding: utf-8 -*-
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
```
- `sys.stdout` 重定向：Windows PowerShell中stdout可能不是UTF-8，中文输出会乱码
- `sys.path.insert`：PowerShell执行时cwd可能不是脚本所在目录，不加会导致`ModuleNotFoundError`

#### 4.3 文档格式要求

- 标题（一级标题）：中文黑体，蓝色主题 `RGBColor(0x1A,0x47,0x8A)`，14pt，加粗
- 正文：宋体11pt，1.5倍行距，首行缩进0.74cm（约两字符）
- 副标题：12pt灰色 `RGBColor(0x55,0x55,0x55)`，居中
- 文档标题（Title）：黑体22pt，蓝色，居中

#### 4.4 目录TOC生成

在文档标题之后、正文之前，添加TOC域。需要引入：
```python
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
```

TOC域构造：使用 `w:fldChar`（begin/separate/end）+ `w:instrText` 构造域，其中 `w:instrText` 的文本为 `TOC \o "1-3" \h \z \u`。在separate和end之间放提示文本：「请在Word中右键此处选择「更新域」以生成目录」。

在TOC之后、正文之前加 `doc.add_page_break()` 分页。

#### 4.5 字体设置函数（推荐封装）

```python
def set_font(run, name='宋体', size=11, bold=False, color=None):
    from docx.shared import Pt, RGBColor
    from docx.oxml.ns import qn
    run.font.name = name
    run.font.size = Pt(size)
    run.font.bold = bold
    run._element.rPr.rFonts.set(qn('w:eastAsia'), name)
    if color:
        run.font.color.rgb = color
```

#### 4.6 长内容分批生成的特殊策略

当内容量特别大（如15+问题、每问题5+要点）时：

1. **不要试图一次写完所有数据**——分问题写入`_qa_data.py`
   - 先写Q1-Q5的数据，运行渲染确认格式正确
   - 再追加Q6-Q10，再追加Q11-Q15
   - 每次追加后运行验证脚本确认
2. **渲染脚本保持独立不变**——只改数据文件，不改渲染逻辑
3. **验证脚本也单独维护**——每次修改数据后都跑一遍

#### 4.7 执行与编码问题

在Windows PowerShell中执行：
```powershell
python3 -u "E:\your\path\to\_gen_word.py" 2>&1 | Out-String
```
- `-u`：Python不使用输出缓冲，可实时看到进度
- `2>&1 | Out-String`：把stderr也包含在stdout中，确保看到完整输出

**不要使用 `chcp 65001` 切换编码页**——这个方案在长中文路径下可能导致脚本执行失败且看不到错误信息。直接用 `-u` 参数更可靠。

### Step 5：验证与交付

- 写一个独立的验证脚本（如 `_verify.py`），检查：
  - 文件是否存在、大小是否正常（通常40-60KB）
  - 用python-docx打开，检查段落数
  - 打印所有 Heading 样式段落，确认结构完整
- 验证脚本也放在同一目录，用相同方式执行
- 交付时告知用户：文件名和路径、章节结构、目录需手动"更新域"（右键→更新域）

## 注意事项

### 编码与中文处理
- **问题中的中文引号（""）在JSON中会导致解析错误**：JSON字符串不能直接出现中文左右引号，必须用Unicode转义 `\u201c` `\u201d` 或英文直引号。这是多次踩坑后确认的。
- **更可靠的方式**：直接用Python数据文件（`.py`）而非JSON，Python原生支持中文引号，无需转义。
- **文档路径含中文**：用 `os.path.join` 拼接，避免手写带中文的长路径字符串。
- **Python stdout重定向**：生成脚本中加 `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')` 避免中文输出乱码。

### 代码中字符串引号嵌套
- Python代码用单引号 `'...'` 包裹字符串时，内部可直接用双引号和中文引号
- 用双引号 `"..."` 包裹时，中文引号也可以直接写，Python能正确处理
- **避免**在双引号包裹的字符串中混用不同层级的双引号

### 文件命名
- 文件名简洁明了，用下划线或短横线分隔
- 辅助脚本用 `_` 前缀命名

### 验证方法
- 每次修改数据文件后，运行渲染脚本+验证脚本
- 验证脚本打印段落数和Heading列表，快速定位内容是否完整
- **终端中文显示乱码只是PowerShell编码问题，不影响Word文档中文显示**

### 其他
- 调研阶段如遇网站访问限制，诚实标注"数据来源于公开知识库，建议核实原始来源"
- 不猜测用户未要求回答的问题
- 保留学习材料的原文引用，不自行修改原文内容
- 生成脚本和数据文件保留在工作目录中，方便后续修改复用
