---
name: doc-video-duration
description: 扫描 Word 文档中所有视频链接（B站/微信视频号），通过 B站 API 逐一查询真实时长，替换占位时长并追加到缺失的视频条目后。输出带真实时长的完整版文档。
trigger: 用户要求为 Word 文档中的视频材料核对/添加/补充/替换时长，或要求整理文档中视频链接的时长信息
---

# doc-video-duration — Word 文档视频时长标记技能

## 适用场景
用户要求为 Word 文档中的视频材料核对/添加/补充/替换时长标记。

## 前置条件
- 目标文档是 `.docx` 格式
- 视频链接主要是 B站（bilibili.com/video、b23.tv）和微信视频号（weixin.qq.com/sph/）
- 当前工作区已设定

## 执行步骤

### Step 1: 定位文档
- 确认用户指的是哪个文档
- 如果用户未指定，搜索当前工作区中最近修改的 `.docx` 文件

### Step 2: 创建副本
```python
import shutil
shutil.copy2(源文件路径, 副本路径)
```
- 副本命名：在原文件名后加 `_完整版`
- 始终在副本上操作，不修改源文件

### Step 3: 扫描文档结构
使用 python-docx 读取文档，通过 `python-docx` 的 XML 解析能力扫描所有 `w:instrText` 元素：

```python
from docx import Document
from docx.oxml.ns import qn

doc = Document(path)
body = doc.element
for instr in body.iter(qn('w:instrText')):
    # 检查是否包含 HYPERLINK
    if 'HYPERLINK' not in (instr.text or ''):
        continue
    # 提取 URL
    import re
    m = re.search(r'HYPERLINK\s+"([^"]+)"', instr.text)
    url = m.group(1)
```

### Step 4: 识别视频链接
视频类 URL 特征：
- B站: `bilibili.com/video` 或 `b23.tv`
- 微信视频号: `weixin.qq.com/sph/`

非视频类 URL（排除）：
- 公众号文章: `mp.weixin.qq.com/s/`
- PDF: `.pdf`
- 网页文章: `tv.cctv.com`、`stanford.edu` 等

### Step 5: 检查已有视频条目
同时检查两种形式：
1. **HYPERLINK 域**：通过 XML 解析获取
2. **纯文字标题**：段落文本中匹配 `哔哩哔哩`、`bilibili`、`TED演讲`、`焦点访谈`、`《世界历史》` 等关键词

### Step 6: 检查是否已有时长
使用正则检测条目中是否已包含时长信息：
```python
has_time_re = re.compile(r'[（\(]\d+\.?\d*\s*(min|s|h)\d*\.?\d*\s*(min|s)?[）\)]')
```
跳过已有时长的条目，只处理缺失的。

### Step 7: 查询 B站 API 获取真实时长
从 URL 中提取 BV 号，调用 B站 API：

```python
import urllib.request, json

bv = re.search(r'(BV[a-zA-Z0-9]+)', url).group(1)
api_url = f'https://api.bilibili.com/x/web-interface/view?bvid={bv}'
req = urllib.request.Request(api_url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.bilibili.com/'
})
with urllib.request.urlopen(req, timeout=15) as resp:
    data = json.loads(resp.read())
    seconds = data['data']['duration']
    minutes = seconds // 60
    secs = seconds % 60
    time_str = f'{minutes}min{secs}s'
```

**注意**：API 返回的 `duration` 字段单位是秒。如果 API 返回 403，确保添加 `Referer` 头。如果 SSL 错误，重试。

### Step 8: 在文档中插入时长标记
找到 HYPERLINK 域的 `end fldChar` 所在 `<w:r>` 元素，在其后插入新 run：

```python
from docx.oxml import OxmlElement

# fldChar 是 <w:r> 的直接子元素（不是 rPr 的子元素）
def get_fc_type(r_elem):
    fc = r_elem.find(qn('w:fldChar'))
    if fc is not None:
        return fc.get(qn('w:fldCharType'))
    rPr = r_elem.find(qn('w:rPr'))
    if rPr is not None:
        fc = rPr.find(qn('w:fldChar'))
        if fc is not None:
            return fc.get(qn('w:fldCharType'))
    return None

# 找到 end fldChar
current = instr_elem.getparent()
while current is not None:
    if current.tag == qn('w:r'):
        if get_fc_type(current) == 'end':
            end_r = current
            break
    current = current.getnext()

# 在 end_r 之后插入 (时长)
new_r = OxmlElement('w:r')
new_t = OxmlElement('w:t')
new_t.text = f'({time_str})'
new_r.append(new_t)
end_r.addnext(new_r)
```

### Step 9: 处理微信视频号
微信视频号页面是 JS 渲染的，无法自动获取时长。告知用户这 3 条需要人工确认，暂时保留占位时长 `(25min14s)`。

### Step 10: 验证
遍历所有视频 HYPERLINK，检查其所在段落文本是否包含时长标记：
```python
# 取段落文本
pp = instr
while pp is not None:
    if pp.tag == qn('w:p'):
        break
    pp = pp.getparent()
all_t = pp.findall('.//' + qn('w:t'))
full_text = ''.join(t.text or '' for t in all_t)
```

### Step 11: 保存并报告
- 保存文档
- 向用户报告：
  - 总视频条目数
  - 已有时长数
  - 本次补充数
  - 微信视频号待确认数
  - 输出文件路径

## 重要注意事项

1. **fldChar 位置**：`fldChar` 是 `<w:r>` 的**直接子元素**，不是 `<w:rPr>` 的子元素。两个位置都要检查。
2. **副本操作**：始终在副本上操作，不修改源文件。
3. **保留已有时长**：文档中已有原文时长标记的条目不要覆盖。
4. **纯文字标题**：有些视频只有标题文本没有链接，需要通过关键字匹配来识别。
5. **B站 API 限制**：建议每次查询间隔 0.5-1 秒，避免触发限流。如果 API 返回 403，添加 `Referer` 头。
6. **时长格式**：统一使用 `(XminXs)` 格式，如 `(10min34s)`。如果秒数为 0，使用 `(Xmin)`。
7. **超长视频**：部分深度访谈视频时长可达 200-300 分钟，API 返回正常。
8. **验证完整性**：最后必须验证所有视频条目均已带时长标记，确保缺 0 条。