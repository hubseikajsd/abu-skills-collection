---
name: doc-video-summary
description: 扫描 Word 文档中所有视频材料（B站/微信视频号等），通过 web_search 逐一检索视频标题/关键词，获取内容概括并追加到每个视频条目后，输出带内容概括的完整版文档。
trigger: 用户要求为 Word 文档中的视频材料补充/添加/生成内容概括、摘要、简介，或要求检索视频讲了什么、大概内容
---

# doc-video-summary — Word 文档视频内容概括技能

## 适用场景
用户要求为 Word 文档中的视频材料补充/添加/生成内容概括（摘要/简介），或要求检索视频"讲了什么"、"大概内容"。

## 前置条件
- 目标文档是 `.docx` 格式
- 视频链接主要是 B站（bilibili.com/video、b23.tv）和微信视频号（weixin.qq.com/sph/）
- 工作区已设定

## 执行步骤

### Step 1: 定位文档
- 确认用户指的是哪个文档
- 如果用户未指定，搜索当前工作区中匹配关键词的 `.docx` 文件
- 与用户确认目标文档

### Step 2: 创建副本
```python
import shutil
shutil.copy2(源文件路径, 副本路径)
```
- 副本命名：在原文件名后加 `（含视频概括）`
- 始终在副本上操作，不修改源文件

### Step 3: 提取视频条目
使用 python-docx 读取文档，提取所有视频相关段落：

```python
from docx import Document

doc = Document(path)
video_entries = []
for para in doc.paragraphs:
    text = para.text.strip()
    # 识别视频条目特征：包含视频链接关键词或【必看】【选看】标记
    if any(kw in text for kw in ['【必看】', '【选看】', 'bilibili', 'b23.tv', 'weixin.qq.com/sph/']):
        video_entries.append(text)
```

### Step 4: 提取搜索关键词
从每个视频条目中提取关键词用于搜索。提取策略：
1. 去除 `【必看】`/`【选看】` 标记
2. 去除时长信息如 `（5min12s）`、`（1h10min）`
3. 去除 URL 链接
4. 保留核心标题文本作为搜索关键词

### Step 5: 并行检索内容概括
使用 `run_agent_batch` 将视频分组后并行检索（每组最多 12 个视频，建议分 3-4 组）：

```
对每个视频，使用 web_search 搜索"视频标题 内容概括"或"视频标题 讲了什么"
获取每个视频的 1-2 句内容概括
```

**检索原则**：
- 优先使用 web_search 搜索关键信息
- 如果搜索工具不可用，可基于公开行业知识提供概括，但需标注"基于公开信息整理"
- 对于知名事件/发布会/产品发布类视频，可直接基于已知信息概括
- 对于小众/个人创作者视频，必须搜索确认

### Step 6: 生成概括文本
概括格式规范：
- 每条约 50-100 字
- 以 "→ " 开头，灰色斜体小字呈现
- 使用简洁中文，说明视频的核心内容/观点/事件
- 避免主观评价，保持事实性描述

### Step 7: 插入文档
使用 python-docx 的 XML 操作，在每个视频条目段落后面插入概括段落：

```python
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def make_summary_paragraph(text):
    """创建灰色斜体小字概括段落"""
    p = OxmlElement('w:p')
    pPr = OxmlElement('w:pPr')
    ind = OxmlElement('w:ind')
    ind.set(qn('w:left'), '720')  # 左缩进
    pPr.append(ind)
    spacing = OxmlElement('w:spacing')
    spacing.set(qn('w:before'), '0')
    spacing.set(qn('w:after'), '80')
    pPr.append(spacing)
    p.append(pPr)

    r = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    sz = OxmlElement('w:sz')
    sz.set(qn('w:val'), '18')  # 9pt
    rPr.append(sz)
    color = OxmlElement('w:color')
    color.set(qn('w:val'), '666666')  # 灰色
    rPr.append(color)
    i_elem = OxmlElement('w:i')  # 斜体
    rPr.append(i_elem)
    r.append(rPr)

    t = OxmlElement('w:t')
    t.set(qn('xml:space'), 'preserve')
    t.text = '\u2192 ' + text  # → 箭头
    r.append(t)
    p.append(r)
    return p
```

**关键技巧**：从后往前插入，避免索引偏移：
```python
# 先收集所有段落元素
para_elements = list(body.findall(qn('w:p')))

# 按位置从大到小排序，从后往前插入
sorted_keywords = sorted(keywords, key=lambda k: positions[k], reverse=True)
for keyword in sorted_keywords:
    pos = positions[keyword]
    para_elem = para_elements[pos]
    summary_para = make_summary_paragraph(summaries[keyword])
    para_elem.addnext(summary_para)
```

### Step 8: 引号匹配处理
由于 Word 文档中可能使用中文弯引号（\u201c\u201d），而搜索关键词中可能使用直引号，匹配时需归一化：

```python
def normalize_quotes(s):
    return s.replace('\u201c', '"').replace('\u201d', '"')
```

### Step 9: 保存并验证
保存文档后，重新读取确认：
- 所有视频条目下方是否都有概括
- 格式是否正确（灰色、斜体、缩进）
- 统计：总视频数 / 已概括数 / 遗漏数

## 重要注意事项

1. **副本操作**：始终在副本上操作，不修改源文件。
2. **并行检索**：视频数量较多时使用 `run_agent_batch` 并行搜索，提高效率。
3. **引号归一化**：Word 文档中的中文弯引号与代码中的直引号需要归一化后再匹配。
4. **从后插入**：使用 `addnext()` 插入段落时，必须从后往前处理，避免索引偏移。
5. **概括质量**：概括应聚焦视频的核心内容，提供观看前的参考价值，而非简单重复标题。
6. **搜索不可用时**：如果搜索工具不可用，可以基于公开行业知识提供概括，但需标注信息来源。
7. **保留已有内容**：如果文档中已有概括或注释，不要重复添加。