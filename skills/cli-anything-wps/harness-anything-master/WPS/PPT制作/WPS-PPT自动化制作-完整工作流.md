# WPS PPT 自动化制作 — 完整工作流

> 任何 AI 模型（Claude / GPT / Gemini 等）均可按此文独立完成 PPT 制作  
> 适用范围：机构介绍、数据汇报、院校展示、科研答辩等数据驱动型 PPT  
> 核心工具：Python + matplotlib + WPS COM（Windows）  
> 画布基准：**960 × 540 pt（16:9）**

---

## 一、核心架构：三文件分离

```
project/work/
├── template_bg.png       ← 从 PPTX 模板提取的母版底图
├── gen_charts.py         ← 生成所有图表 PNG
├── images/               ← 图表输出目录
│   ├── chart_rank.png
│   ├── chart_nums.png
│   └── ...
├── build_ppt.py          ← PPT 构建引擎（本工作流核心）
├── output.pptx
└── output.pdf
```

**为什么必须分离：**

| 如果混在一起 | 分离后的好处 |
|-------------|-----------|
| JSON/代码/图表互相依赖，改一处全崩 | 图表可单独重跑，不影响 PPT 代码 |
| 换个机构要重写全部代码 | 改颜色常量 + 改 slides 数据 = 新 PPT |
| 配色调整要在数百行代码中翻找 | 改顶部 3 个颜色变量即可 |

---

## 二、第一步：提取模板背景

```python
# extract_bg.py — 从用户 PPTX 模板提取母版背景为 PNG
import zipfile, os

pptx_path = r"用户模板.pptx"
out_dir = r"./work"
os.makedirs(out_dir, exist_ok=True)

with zipfile.ZipFile(pptx_path, 'r') as z:
    media = [n for n in z.namelist() if 'media' in n and n.endswith('.png')]
    for m in sorted(media):
        z.extract(m, out_dir)
        old = os.path.join(out_dir, m)
        new = os.path.join(out_dir, "template_bg.png")
        if os.path.exists(old) and old != new:
            os.replace(old, new)
        print(f'Extracted: template_bg.png')
```

---

## 三、第二步：搜索资料 + 确定配色

### 3.1 搜索

```
WebSearch: "XX University brand color hex code"
WebSearch: "XX University rankings enrollment endowment Nobel 2025"
```

### 3.2 配色常量

```python
# 从搜索结果中提取品牌色，填入以下常量
O = '#8C1515'   # 机构品牌色（主色，视觉占 60-70%）
B = '#000000'   # 辅色（黑色，用于对比数据）
D = '#333333'   # 正文黑（所有文字使用此色或更暗）
G = '#666666'   # 辅助灰（副标题、说明文字）
```

### 3.3 常见品牌色速查

| 机构 | 品牌色 | 十六进制 |
|------|--------|---------|
| 斯坦福大学 | Cardinal Red | `#8C1515` |
| 普林斯顿大学 | Orange | `#EE7F2D` |
| 哈佛大学 | Crimson | `#A51C30` |
| 耶鲁大学 | Yale Blue | `#00356B` |
| MIT | MIT Red | `#A31F34` |
| 南方科技大学 | SUSTech Blue | `#004098` |

---

## 四、第三步：生成图表

### 4.1 铁律（违反则图表不可用）

| 规则 | 正确 | 错误 |
|------|------|------|
| 背景 | `savefig.transparent = True` | 白色/有色背景遮挡模板 |
| 文字颜色 | `#333333`（黑色） | 白色 `#FFFFFF`、灰色 `#888888` |
| 标题颜色 | `#333333`（黑色） | 品牌色（PPT 投影时看不清） |
| 柱状图填充 | 可用品牌色 `#8C1515` | 浅色/白色填充 |
| DPI | 250 | < 150（放大模糊） |
| 字体 | SimHei / Microsoft YaHei | 系统默认（中文乱码） |

### 4.2 图表代码模板

```python
# gen_charts.py
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os

out = r"./work/images"
os.makedirs(out, exist_ok=True)

# 全局设置
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei']
plt.rcParams['axes.unicode_minus'] = False
plt.rcParams['savefig.dpi'] = 250
plt.rcParams['savefig.transparent'] = True

O = '#8C1515'  # 品牌色
B = '#000000'
D = '#333333'
G = '#555555'

# ===== 图表 1：排名柱状图 =====
fig, ax = plt.subplots(figsize=(7, 3))
fig.patch.set_alpha(0)

labels = ['U.S.News', 'QS', 'THE', 'Forbes', 'ARWU']
values = [4, 3, 6, 2, 2]
colors = [O, O, B, O, G]

bars = ax.bar(labels, values, color=colors, width=0.5, edgecolor='white')
for bar, val in zip(bars, values):
    ax.text(bar.get_x() + bar.get_width()/2,
            bar.get_height() + 0.15,
            f'#{val}',
            ha='center', fontsize=16, fontweight='bold', color=D)

ax.set_ylim(0, 8)
ax.set_title('2025 排名', fontsize=16, fontweight='bold', color=D, pad=12)
for sp in ['top', 'right']:
    ax.spines[sp].set_visible(False)
ax.tick_params(labelsize=12, colors=D)

plt.tight_layout()
fig.savefig(os.path.join(out, 'chart_rank.png'), bbox_inches='tight')
plt.close()
print('OK chart_rank.png')

# ===== 图表 2：四列数字卡 =====
fig, axes = plt.subplots(1, 4, figsize=(10, 2.2))
fig.patch.set_alpha(0)

nums = [('1885年', '建校'), ('#4', '全美排名'), ('84位', '诺贝尔奖'), ('$36.5B', '捐赠基金')]
colors = [O, O, B, O]

for ax, (num, label), clr in zip(axes, nums, colors):
    ax.set_facecolor('none')
    ax.axis('off')
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.text(5, 6.5, num, fontsize=32, fontweight='bold', color=clr,
            ha='center', va='center')
    ax.text(5, 1.8, label, fontsize=13, color=G, ha='center', va='center')

plt.tight_layout()
fig.savefig(os.path.join(out, 'chart_nums.png'), bbox_inches='tight')
plt.close()
print('OK chart_nums.png')

# ... 继续添加其他图表（柱状图/横向柱状图/饼图等）
```

### 4.3 图表尺寸对照表

| 图表类型 | figsize | PPT 中建议尺寸 (w×h pt) |
|---------|---------|------------------------|
| 四列数字卡 | (10, 2.2) | 800 × 176 |
| 单张柱状图 | (7, 3) | 490 × 210 |
| 横向柱状图 | (7, 3.2) | 490 × 260 |
| 六列宽图 | (10, 3) | 840 × 250 |

---

## 五、第四步：编写 PPT 构建引擎

### 5.1 完整代码模板

以下是一个可直接运行的 14 页 PPT 引擎。使用时只需修改：
1. 顶部颜色常量 `O`（品牌色）
2. `slides` 列表中的数据

```python
# build_ppt.py — 完整 PPT 构建引擎
# -*- coding: utf-8 -*-
import os, pythoncom, win32com.client

# ====== 配置 ======
OUT = r"./work"
FT = 'SimHei'          # 标题字体
FB = 'Microsoft YaHei'  # 正文字体
O = '#8C1515'           # 品牌色（改为目标机构的品牌色）
B = '#000000'           # 辅色黑
D = '#333333'           # 正文黑
G = '#666666'           # 辅助灰

def h2b(h):
    """十六进制颜色 → WPS COM RGB 整数（BGR 顺序）"""
    h = h.lstrip('#')
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (b << 16) | (g << 8) | r

# ====== 基础形状函数 ======

def rect(s, x, y, w, h, color):
    """画矩形"""
    r = s.Shapes.AddShape(1, x, y, w, h)
    r.Fill.ForeColor.RGB = color
    r.Fill.Visible = True
    r.Line.Visible = False
    return r

def circle(s, x, y, w, h, color):
    """画圆形"""
    c = s.Shapes.AddShape(9, x, y, w, h)
    c.Fill.ForeColor.RGB = color
    c.Fill.Visible = True
    c.Line.Visible = False
    return c

def txt(s, x, y, w, h, text, fs=24, color=0x333333, bold=False,
        align=1, font=FB, spacing=1.3):
    """画文本框"""
    t = s.Shapes.AddTextbox(1, x, y, w, h)
    tr = t.TextFrame.TextRange
    tr.Text = text
    tr.Font.Size = fs
    tr.Font.Color = color
    tr.Font.Name = font
    tr.Font.Bold = bold
    tr.ParagraphFormat.Alignment = align
    try:
        tr.ParagraphFormat.SpaceWithin = spacing
    except:
        pass
    return t

# ====== 元素路由器（每个 type 对应一个绘制函数） ======

def draw_text(s, e):
    """type='text'：通用文字"""
    c = h2b(e.get('color', D))
    return txt(s, e['x'], e['y'], e['w'], e['h'], e['text'],
               fs=e.get('fs', 24), color=c,
               bold=e.get('bold', False),
               align=e.get('align', 1),
               font=e.get('font', FB),
               spacing=e.get('line_spacing', 1.3))

def draw_image(s, e):
    """type='image'：插入图片"""
    p = os.path.join(OUT, e['file'])
    if os.path.exists(p):
        s.Shapes.AddPicture(p, False, True, e['x'], e['y'], e['w'], e['h'])

def draw_shape(s, e):
    """type='shape'：矩形/圆形/线条"""
    st = e.get('shape', 'rect')
    x, y, w = e['x'], e['y'], e['w']
    h = e.get('h', e.get('w', 10))
    c = h2b(e.get('color', O))
    if st == 'circle':
        circle(s, x, y, w, h, c)
    else:
        rect(s, x, y, w, h, c)

def draw_table(s, e):
    """type='table'：数据表格（单行、不换行）"""
    rows = e['rows']
    cols = e['cols']
    x, y, w, h = e['x'], e['y'], e['w'], e['h']
    dta = e['data']
    hdr_color = h2b(e.get('header_color', O))
    min_rh = 28
    row_h = max(h // rows, min_rh)
    col_w = w // cols

    for r in range(rows):
        for c in range(cols):
            cx, cy = x + c * col_w, y + r * row_h
            val = dta[r][c] if r < len(dta) and c < len(dta[r]) else ''
            is_hdr = (r == 0)
            bg_c = hdr_color if is_hdr else (
                0xFFFFFF if r % 2 == 0 else h2b('#F5F0ED'))
            fs = e.get('th_fs', 13) if is_hdr else e.get('td_fs', 14)
            tc = 0xFFFFFF if is_hdr else 0x333333
            al = 2 if c > 0 else 1

            rect(s, cx, cy, col_w, row_h, bg_c)
            if val:
                tb = s.Shapes.AddTextbox(1, cx + 3, cy + 2, col_w - 6, row_h - 4)
                tr = tb.TextFrame.TextRange
                tr.Text = str(val)
                tr.Font.Size = fs
                tr.Font.Color = tc
                tr.Font.Name = FT if is_hdr else FB
                tr.Font.Bold = is_hdr
                tr.ParagraphFormat.Alignment = al
                tb.TextFrame.WordWrap = False  # ⚠️ 强制不换行

def draw_card_list_wide(s, e):
    """type='card_list_wide'：目录（编号圆 + 标题 + 副标题）"""
    items = e['items']
    sy = e.get('start_y', 92)
    ih = e.get('item_h', 46)
    hex_colors = [O, B, O, B, O, B, O, B, O, B, O, B]

    for i, item in enumerate(items):
        y = sy + i * ih
        col = h2b(hex_colors[i % len(hex_colors)])

        # 编号圆
        circle(s, 100, y + 4, 32, 32, col)
        t2 = s.Shapes.AddTextbox(1, 100, y + 4, 32, 32)
        tr2 = t2.TextFrame.TextRange
        tr2.Text = item['num']
        tr2.Font.Size = 13
        tr2.Font.Color = 0xFFFFFF
        tr2.Font.Name = FT
        tr2.Font.Bold = True
        tr2.ParagraphFormat.Alignment = 2

        # 标题
        txt(s, 148, y + 2, 280, 26, item['title'],
            fs=22, color=h2b('#1A1A1A'), bold=True, font=FT)
        # 副标题
        txt(s, 148, y + 28, 700, 16, item['sub'],
            fs=14, color=h2b('#555555'), bold=False, font=FB)

def draw_tagline_bar(s, e):
    """type='tagline_bar'：底部品牌色总结条"""
    rect(s, 30, 498, 900, 28, h2b(O))
    txt(s, 40, 501, 880, 22, e['text'],
        fs=14, color=0xFFFFFF, bold=True, align=2, font=FB)

def draw_num_big(s, e):
    """type='num_big'：大数字 + 标签（三段式，绝不重叠）"""
    c = h2b(e.get('color', O))
    x, y, w, h = e['x'], e['y'], e['w'], e['h']
    num_h = int(h * 0.40)   # 数字占 40%
    gap = int(h * 0.10)     # 间隙 10%
    lbl_h = int(h * 0.50)   # 标签占 50%

    # 数字
    t1 = s.Shapes.AddTextbox(1, x, y, w, num_h)
    tr1 = t1.TextFrame.TextRange
    tr1.Text = e['num']
    tr1.Font.Size = e.get('fs', 34)
    tr1.Font.Color = c
    tr1.Font.Name = 'Arial'
    tr1.Font.Bold = True
    tr1.ParagraphFormat.Alignment = 2

    # 标签（在间隙下方）
    t2 = s.Shapes.AddTextbox(1, x, y + num_h + gap, w, lbl_h)
    tr2 = t2.TextFrame.TextRange
    tr2.Text = e['label']
    tr2.Font.Size = 13
    tr2.Font.Color = h2b(G)
    tr2.Font.Name = FB
    tr2.Font.Bold = False
    tr2.ParagraphFormat.Alignment = 2

# ====== 路由表 ======
ROUTERS = {
    'text': draw_text,
    'image': draw_image,
    'shape': draw_shape,
    'table': draw_table,
    'card_list_wide': draw_card_list_wide,
    'tagline_bar': draw_tagline_bar,
    'num_big': draw_num_big,
}

# ====== 幻灯片数据 ======
# 每页是一个 {'elements': [...]} 字典
# 每个 element 是一个 {'type': '...', ...} 字典

slides = []

# ---- S1: 封面 ----
slides.append({'elements': [
    {'type': 'shape', 'shape': 'rect', 'x': 0, 'y': 0, 'w': 960, 'h': 5, 'color': O},
    {'type': 'shape', 'shape': 'rect', 'x': 0, 'y': 535, 'w': 960, 'h': 5, 'color': O},

    # 标题：SimHei 48pt 品牌色居中
    {'type': 'text', 'x': 60, 'y': 26, 'w': 840, 'h': 52,
     'text': 'XX 大学', 'fs': 48, 'color': O, 'bold': True, 'align': 2, 'font': FT},

    # 副标题
    {'type': 'text', 'x': 60, 'y': 82, 'w': 840, 'h': 24,
     'text': 'University Name', 'fs': 20, 'color': G, 'bold': False, 'align': 2, 'font': 'Arial'},

    # 图表
    {'type': 'image', 'x': 80, 'y': 160, 'w': 800, 'h': 170,
     'file': 'images/chart_nums.png'},

    # 四列数字卡（num_big 类型）
    {'type': 'num_big', 'x': 80, 'y': 355, 'w': 180, 'h': 65,
     'num': '1885', 'label': '建校年份', 'color': O, 'fs': 36},
    {'type': 'num_big', 'x': 280, 'y': 355, 'w': 160, 'h': 65,
     'num': '#4', 'label': '全美排名', 'color': B, 'fs': 36},
    {'type': 'num_big', 'x': 460, 'y': 355, 'w': 180, 'h': 65,
     'num': '84位', 'label': '诺贝尔奖', 'color': O, 'fs': 34},
    {'type': 'num_big', 'x': 660, 'y': 355, 'w': 220, 'h': 65,
     'num': '$36.5B', 'label': '捐赠基金', 'color': B, 'fs': 32},

    # 底部
    {'type': 'text', 'x': 60, 'y': 440, 'w': 840, 'h': 42,
     'text': '校训原文 · 地点 · 特色', 'fs': 16, 'color': D, 'bold': False, 'align': 2, 'font': FB},
]})

# ---- S2: 目录 ----
slides.append({'elements': [
    {'type': 'shape', 'shape': 'rect', 'x': 0, 'y': 0, 'w': 960, 'h': 5, 'color': O},
    {'type': 'shape', 'shape': 'rect', 'x': 0, 'y': 535, 'w': 960, 'h': 5, 'color': O},

    # 标题：居中 42pt
    {'type': 'text', 'x': 60, 'y': 16, 'w': 840, 'h': 40,
     'text': '目  录', 'fs': 42, 'color': O, 'bold': True, 'align': 2, 'font': FT},

    # 编号列表
    {'type': 'card_list_wide', 'start_y': 90, 'item_h': 52, 'items': [
        {'num': '01', 'title': '历史与声望',
         'sub': '建校年份 · 排名 · 联盟 · 地理位置 · 校园面积'},
        {'num': '02', 'title': '学术体系',
         'sub': '学院设置 · 师生比 · 课程规模 · 教学特色 · 本科生科研'},
        # ... 继续添加 6-8 项
    ]},
]})

# ---- S3: 内容页（左图右文模板）----
slides.append({'elements': [
    {'type': 'shape', 'shape': 'rect', 'x': 0, 'y': 0, 'w': 960, 'h': 5, 'color': O},
    {'type': 'shape', 'shape': 'rect', 'x': 0, 'y': 535, 'w': 960, 'h': 5, 'color': O},

    # ⚠️ 标题 y=14, h=38 → 结束于 y≈52 → 内容从 y≥90 开始（3-4行间隙）
    {'type': 'text', 'x': 60, 'y': 14, 'w': 840, 'h': 38,
     'text': '页面标题', 'fs': 40, 'color': O, 'bold': True, 'align': 2, 'font': FT},

    # 左图：x=30-50, y=90-100, w=440-520
    {'type': 'image', 'x': 30, 'y': 92, 'w': 490, 'h': 230,
     'file': 'images/chart_rank.png'},

    # 右文：x=545+, y=92+, 每行一个 textbox
    {'type': 'text', 'x': 545, 'y': 92, 'w': 385, 'h': 26,
     'text': '第一行文字 · 加粗品牌色', 'fs': 24, 'color': O, 'bold': True, 'align': 1, 'font': FB},
    {'type': 'text', 'x': 545, 'y': 128, 'w': 385, 'h': 24,
     'text': '第二行文字', 'fs': 20, 'color': D, 'bold': False, 'align': 1, 'font': FB},
    {'type': 'text', 'x': 545, 'y': 164, 'w': 385, 'h': 24,
     'text': '第三行文字', 'fs': 20, 'color': D, 'bold': False, 'align': 1, 'font': FB},
    # ... 每行间距 34-36pt，最多 5-7 行

    # 底部总结条
    {'type': 'tagline_bar', 'text': '底部总结文字 · 关键数据 · 一句话核心信息'},
]})

# ---- S13: 总结页（2×3 卡片）----
slides.append({'elements': [
    {'type': 'shape', 'shape': 'rect', 'x': 0, 'y': 0, 'w': 960, 'h': 5, 'color': O},
    {'type': 'shape', 'shape': 'rect', 'x': 0, 'y': 535, 'w': 960, 'h': 5, 'color': O},

    {'type': 'text', 'x': 60, 'y': 14, 'w': 840, 'h': 38,
     'text': '六大核心亮点', 'fs': 40, 'color': O, 'bold': True, 'align': 2, 'font': FT},

    # 第一行 3 个卡片（顶部 4pt 色线 + 标题 + 说明）
    {'type': 'shape', 'shape': 'rect', 'x': 22, 'y': 80, 'w': 295, 'h': 5, 'color': O},
    {'type': 'text', 'x': 22, 'y': 95, 'w': 295, 'h': 30,
     'text': '亮点一', 'fs': 24, 'color': h2b(O), 'bold': True, 'align': 1, 'font': FT},
    {'type': 'text', 'x': 22, 'y': 132, 'w': 295, 'h': 68,
     'text': '描述文字第一行\n描述文字第二行\n描述文字第三行',
     'fs': 16, 'color': h2b(D), 'bold': False, 'align': 1, 'font': FB, 'line_spacing': 1.35},

    # ... 继续 2×3=6 个卡片（注意 x 偏移：22, 332, 642）
]})

# ---- S14: 致谢 ----
slides.append({'elements': [
    {'type': 'shape', 'shape': 'rect', 'x': 0, 'y': 0, 'w': 960, 'h': 8, 'color': O},
    {'type': 'shape', 'shape': 'rect', 'x': 0, 'y': 532, 'w': 960, 'h': 8, 'color': O},

    {'type': 'text', 'x': 60, 'y': 60, 'w': 840, 'h': 48,
     'text': '校训原文（拉丁/德文）', 'fs': 44, 'color': h2b(O), 'bold': True, 'align': 2, 'font': 'Arial'},
    {'type': 'text', 'x': 60, 'y': 120, 'w': 840, 'h': 26,
     'text': '「校训中文翻译」', 'fs': 26, 'color': h2b(O), 'bold': True, 'align': 2, 'font': FB},
    {'type': 'text', 'x': 60, 'y': 160, 'w': 840, 'h': 24,
     'text': 'University Name  ·  建校年份 — 当前年份', 'fs': 22, 'color': h2b(D), 'bold': True, 'align': 2, 'font': 'Arial'},

    {'type': 'image', 'x': 80, 'y': 210, 'w': 800, 'h': 175, 'file': 'images/chart_nums.png'},

    {'type': 'text', 'x': 60, 'y': 420, 'w': 840, 'h': 42,
     'text': '数据来源：学校官网 · 排名机构 · 教育部数据库 · 公开媒体报道',
     'fs': 14, 'color': h2b(G), 'bold': False, 'align': 2, 'font': FB},
]})

# ====== 构建引擎（不要修改） ======

pythoncom.CoInitialize()
app = win32com.client.Dispatch('KWPP.Application')
app.Visible = True  # 可见模式，方便目视检查

ppt = app.Presentations.Add()
ppt.PageSetup.SlideWidth = 960
ppt.PageSetup.SlideHeight = 540

idx = [1]

def new_slide():
    s = ppt.Slides.Add(idx[0], 12)
    idx[0] += 1
    try:
        s.FollowMasterBackground = False
    except:
        pass
    bg = os.path.join(OUT, 'template_bg.png')
    if os.path.exists(bg):
        s.Background.Fill.UserPicture(bg)
    return s

for elist in slides:
    s = new_slide()
    for elem in elist['elements']:
        router = ROUTERS.get(elem.get('type', 'text'))
        if router:
            try:
                router(s, elem)
            except:
                pass

pptx_path = os.path.join(OUT, 'output.pptx')
ppt.SaveAs(pptx_path)
print(f'PPTX saved: {os.path.getsize(pptx_path):,} bytes')

pdf_path = os.path.join(OUT, 'output.pdf')
try:
    ppt.SaveAs(pdf_path, 32)
    print(f'PDF saved: {os.path.getsize(pdf_path):,} bytes')
except:
    print('PDF export failed')

ppt.Close()
try:
    app.Quit()
except:
    pass  # WPS COM Quit 报错可忽略
print('Done!')
```

---

## 六、布局坐标系（960 × 540 pt）

### 6.1 全局硬规则

```
┌────────────────────────────────────────────────────────────┐
│  [品牌色条 y=0, h=4-6]                                     │
│                                                            │
│  标题 y=14, h=38, SimHei 40pt, 品牌色, 居中, 无下划线      │
│                                                            │
│  ← ← ← 3-4 行空白间隙（y=52 → 90, 约 38pt）→ → →         │
│                                                            │
│  ┌─────────────┐   文字行1                                 │
│  │   图 表     │   文字行2    ← 左图右文                   │
│  │   x=30-50   │   文字行3      每行一个 textbox            │
│  │  w=440-520  │   文字行4      行间距 34-36pt              │
│  │             │   文字行5                                 │
│  └─────────────┘   文字行6                                 │
│                                                            │
│  表格 / 数字卡 / 分栏文字                                   │
│                                                            │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│  底部总结条 y=498, h=28, 品牌色底 + 白字                    │
│  [品牌色条 y=535, h=4-6]                                   │
└────────────────────────────────────────────────────────────┘
```

### 6.2 精确坐标表

| 元素 | x | y | w | h | 字体 | 字号 | 颜色 |
|------|:--:|:--:|:--:|:--:|------|:--:|------|
| 标题 | 60 | 14 | 840 | 38-44 | SimHei | 40-48pt | 品牌色 |
| 内容起始 | — | **≥ 90** | — | — | — | — | — |
| 左图 | 30-50 | 90-100 | 440-520 | 210-260 | — | — | — |
| 右文每行 | 545-580 | 92+ | 350-420 | 22-26 | Microsoft YaHei | 18-24pt | #333333 |
| 右文行间距 | — | +34~36 | — | — | — | — | — |
| 底部总结条 | 30 | 498 | 900 | 28 | Microsoft YaHei | 14pt | 白字品牌色底 |
| 安全下边界 | — | ≤ 520 | — | — | — | — | — |

### 6.3 2×3 卡片坐标

| 列 1 (x=22) | 列 2 (x=332) | 列 3 (x=642) |
|------------|------------|------------|
| 行 1: y=80 | 行 1: y=80 | 行 1: y=80 |
| 行 2: y=225 | 行 2: y=225 | 行 2: y=225 |
| 每个卡片 w=295, h≈145 |

---

## 七、字号体系

| 层级 | 字体 | 字号 | 颜色 | 用途 |
|------|------|:--:|------|------|
| H1 | SimHei | 40-48pt | 品牌色 | 页面标题 |
| H2 | Microsoft YaHei | 24-26pt | 品牌色 | 段落标题 |
| H3 | Microsoft YaHei | 20-22pt | 品牌色/黑 | 目录标题 |
| Body | Microsoft YaHei | 18-20pt | #333333 | 正文 |
| Body-S | Microsoft YaHei | 16-17pt | #333333 | 卡片说明 |
| Caption | Microsoft YaHei | 14-15pt | #666666 | 数据来源/注释 |
| Table | Microsoft YaHei/SimHei | 13-15pt | #333333/白 | 表格文字 |
| Number | Arial | 28-36pt | 品牌色/黑 | 大数字 |
| Number-Label | Microsoft YaHei | 13pt | #666666 | 数字下方标签 |
| Tagline | Microsoft YaHei | 14pt | 白色 | 底部总结条 |

---

## 八、元素类型完整规范

### 8.1 `text` — 通用文字

```python
{
    'type': 'text',
    'x': 545, 'y': 92, 'w': 385, 'h': 26,  # 位置尺寸
    'text': '文字内容',
    'fs': 20,          # 字号（默认 24）
    'color': '#333333', # 颜色（默认正文黑）
    'bold': False,     # 加粗（默认 False）
    'align': 1,        # 对齐：1=左 2=中 3=右（默认 1）
    'font': 'Microsoft YaHei',  # 字体（默认 FB）
    'line_spacing': 1.3,        # 行距（默认 1.3）
}
```

### 8.2 `image` — 插入图片

```python
{
    'type': 'image',
    'x': 30, 'y': 92, 'w': 490, 'h': 230,
    'file': 'images/chart_rank.png',  # 相对于 OUT 目录
}
```

### 8.3 `shape` — 矩形/圆形/线条

```python
{
    'type': 'shape',
    'shape': 'rect',  # 'rect' | 'circle' | 'line'
    'x': 0, 'y': 0, 'w': 960, 'h': 5,
    'color': '#8C1515',  # 十六进制颜色
}
```

### 8.4 `table` — 数据表格

```python
{
    'type': 'table',
    'x': 30, 'y': 92, 'w': 440, 'h': 270,
    'rows': 9, 'cols': 2,           # 行数、列数
    'header_color': '#8C1515',       # 表头背景色
    'th_fs': 13,                      # 表头字号
    'td_fs': 14,                      # 数据行字号
    'data': [
        ['列1标题', '列2标题'],       # 第一行 = 表头
        ['数据1', '数据2'],
        # ...
    ],
}
```

### 8.5 `card_list_wide` — 目录编号列表

```python
{
    'type': 'card_list_wide',
    'start_y': 90,   # 第一项起始 y
    'item_h': 52,    # 每项高度（项间距 = item_h）
    'items': [
        {
            'num': '01',            # 编号（显示在圆内）
            'title': '板块名称',     # 标题
            'sub': '简要说明文字',   # 副标题
        },
        # ... 建议 6-8 项
    ],
}
```

### 8.6 `num_big` — 大数字 + 标签

```python
{
    'type': 'num_big',
    'x': 80, 'y': 355, 'w': 180, 'h': 65,
    'num': '8,180',         # 大数字文字
    'label': '英亩校园面积', # 下方标签
    'color': '#8C1515',     # 数字颜色
    'fs': 34,               # 数字字号（默认 34）
}
# 内部布局：数字 40% + 间隙 10% + 标签 50%
```

### 8.7 `tagline_bar` — 底部总结条

```python
{
    'type': 'tagline_bar',
    'text': '总结文字 · 关键数据 · 核心信息',
}
# 固定位置：y=498, h=28, 品牌色底 + 白字
```

---

## 九、表格铁律

| 规则 | 说明 |
|------|------|
| **单行强制** | `WordWrap = False`，绝不换行。文字过长会被截断而非换行 |
| 最小行高 | 28pt，保证 14pt 文字完整显示 |
| 列宽 | 文字不超过列宽-4pt，超长文字应缩减或拆分表格 |
| 行数上限 | 10 行以内（含表头）。超过则拆为两页或两栏 |
| 列数上限 | 3 列以内。超过时手机端/投影端难以阅读 |
| 表头 | 品牌色底 + 白字 + SimHei |
| 数据行 | 奇数白底 + 偶数 `#F5F0ED` 浅色底 + Microsoft YaHei 黑字 |

---

## 十、图表铁律

| 规则 | 代码 | 说明 |
|------|------|------|
| 透明背景 | `savefig.transparent = True` | 不遮挡模板底图 |
| 黑字 | `color = '#333333'` | 标题/轴标签/数值全部黑色 |
| 禁止白字 | — | PPT 背景多为白色，白字 = 看不见 |
| 禁止灰字 | — | `#888888` 在投影仪上对比度不足 |
| 品牌色仅用于色块 | 柱状图填充可用品牌色 | 不要用于文字 |
| DPI | `savefig.dpi = 250` | 放大不模糊 |
| 字体 | `SimHei, Microsoft YaHei` | 中文字体 |

---

## 十一、执行流程（5 步标准工序）

```
步骤1：提取母版
  python extract_bg.py
  → 验证：template_bg.png 存在且 960×540 比例正确

步骤2：搜索资料
  WebSearch → 品牌色 + 排名 + 数据 + 名人 + 校训
  → 确认：至少有 5 个数据维度的来源

步骤3：生成图表
  python gen_charts.py
  → 验证：images/ 下有 ≥6 张 PNG，所有 dpi=250

步骤4：编写引擎
  复制上面的 build_ppt.py 模板
  → 改颜色常量（O = 品牌色）
  → 改 slides 数据（14 页内容）
  → 改图表引用（file 路径）
  → python -c "compile(open('build_ppt.py').read(),'test','exec')" 检查语法

步骤5：构建
  taskkill //F //IM wps.exe //T
  python build_ppt.py
  → 验证：PPTX > 800KB，PDF 可打开，WPS 可见模式目视检查
```

---

## 十二、常见报错速查

| 报错 | 原因 | 解决 |
|------|------|------|
| `KWPP.Application.Quit` AttributeError | 正常，WPS COM 退出信号 | 用 `try/except` 包裹，忽略 |
| `'int' object has no attribute 'lstrip'` | `h2b()` 收到的是整数而非十六进制字符串 | 检查颜色变量是否被提前转换 |
| 图片不显示 | 路径使用了相对路径 | 用 `os.path.join(OUT, file)` 拼绝对路径 |
| 中文显示方框 | 系统未安装 SimHei | 改用 Microsoft YaHei |
| PPTX 0KB | WPS 进程占用 | `taskkill` 后重试 |
| 数字和标签重叠 | `num_big` 间隙不足 | 确认使用三段式（40%+10%+50%） |
| 表格文字换行遮挡 | 未设置 WordWrap=False | 确认 `tb.TextFrame.WordWrap = False` |
| JSON 语法错误 | 中文引号 `""` 不合法 | 改用「」或转义 |
| Git Bash 中文路径报错 | Windows 编码问题 | Python 内用 `os.path.join`，避免命令行中文 |

---

## 十三、新项目快速上手清单

- [ ] 复制 `build_ppt.py` 模板到新项目目录
- [ ] 提取用户模板 → `template_bg.png`
- [ ] 搜索品牌色 → 修改 `O` 常量
- [ ] 设计 9 张图表 → 修改 `gen_charts.py`
- [ ] 编写 `gen_charts.py` → 运行 → 检查 images/
- [ ] 确定 14 页标题和布局
- [ ] 逐页填入 slides 数据（每页 ≤80 字 + ≥2 种元素）
- [ ] 检查目录 items 数量 × item_h < 500-start_y
- [ ] `python -c "compile(...)"` 语法检查
- [ ] `taskkill WPS` → 运行构建
- [ ] WPS 目视检查：标题颜色、图文间距、表格单行、数字不重叠
- [ ] 导出 PDF，确认页数完整

---

*本文档可在任意 AI 模型中直接使用。复制 → 改颜色 → 改 slides 数据 → 运行。*
