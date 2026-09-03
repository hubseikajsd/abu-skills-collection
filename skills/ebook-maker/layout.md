# 排版规范

本文件定义电子书的排版参数。修改此文件即可全局调整排版风格，无需改动主 Skill。

---

## 页面尺寸

```
纸张：A4
页边距：上 2.2cm / 下 2.2cm / 左 2cm / 右 2cm
```

## 内容区域

```
正文最大宽度：680px
正文内边距：0 2rem
```

## 页眉页脚

```
页眉：无
页脚：显示页码（默认开启）
```

如果需要关闭页码，注释掉以下 CSS 中的 `@bottom-center` 行。

如果需要额外的页脚文字（如书名/公众号），使用字符串拼接：
```css
@bottom-center { content: "书名 | 公众号 @xxx | 第 " counter(page) " 页"; }
```

---

## 字体

| 用途 | 字体 | 粗细 |
|------|------|------|
| 正文 | Noto Sans SC | 400 |
| 加粗 | Noto Sans SC | 700 |
| 标题（封面、章节） | Noto Serif SC | 900 |
| 代码 | JetBrains Mono | 400 |

字体加载源：
```
https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700;900&family=Noto+Serif+SC:wght@600;700;900&family=JetBrains+Mono:wght@400;500&display=swap
```

如果需要离线字体，替换为本地 @font-face 声明。

## 字号

| 元素 | 屏幕字号 | 打印字号 |
|------|---------|---------|
| 正文 | 15px | 11pt |
| 章节标题 | 1.9rem | — |
| 封面主标题 | 2.4-2.8rem | — |
| 术语名称 | 1.25rem | — |
| 英文副标题 | 0.88rem | — |
| 提示框 | 0.92rem | — |
| 表格 | 0.88-0.9rem | — |
| 代码块 | 0.85rem | — |

## 行高

```
正文行高：1.85
提示框行高：1.85
代码块行高：1.7
```

---

## 配色

```css
--purple: #5B4FBF;       /* 主色：章节标签、术语标题、表头背景 */
--purple-light: #7C71D8;  /* 辅色：提示框左边框 */
--orange: #D35400;        /* 强调色：代码文字、命令、操作提示 */
--text: #2D2D2D;          /* 正文文字 */
--gray: #888;             /* 次要文字：英文名、日期、副标题 */
--tip-bg: #F3F1FB;        /* 提示框背景 */
--tip-border: #DCD8F0;    /* 提示框边框（备用） */
```

如需更换主题色，只改这里的 hex 值即可。其他元素全部通过 var() 引用。

### 配色快捷方案

| 风格 | --purple | --purple-light | --orange | --tip-bg |
|------|----------|---------------|----------|----------|
| 默认紫 | #5B4FBF | #7C71D8 | #D35400 | #F3F1FB |
| 蓝色调 | #2563EB | #60A5FA | #EA580C | #EFF6FF |
| 绿色调 | #059669 | #34D399 | #D97706 | #ECFDF5 |
| 红棕调 | #B91C1C | #F87171 | #92400E | #FEF2F2 |
| 中性灰 | #374151 | #6B7280 | #B45309 | #F3F4F6 |

---

## 元素对齐规范

### 铁律：所有内容元素左右对齐

```css
/* 图片 */
.ebook-img {
  width: 100%;
  max-width: 600px;   /* 不超过正文宽度 */
  display: block;
  margin: 2rem auto;
  border-radius: 10px;
}

/* 横幅图（21:9 / 16:9）可以更宽 */
.ebook-img.banner {
  max-width: 100%;
  border-radius: 8px;
}

/* 表格 */
table {
  width: 100%;
  border-collapse: collapse;
}

/* 提示框 */
.tip {
  width: auto;       /* 跟随父容器宽度 */
}
```

### 铁律（不可违反）：所有代码块 / 内联代码 强制换行

PDF 是静态媒介，没有横向滚动。只要一行代码超出正文区宽度，超出部分在 PDF 里就会被**直接裁掉**。因此所有放代码的标签都必须强制自动换行，不留任何单行长代码。

**适用对象**（全部，不看 class）：`<pre>`、`<code>`、`<pre><code>`、`<kbd>`、`<samp>`、任何带 `code` / `codeblock` 等 class 的容器。

```css
/* 代码容器：屏幕端允许横向滚动，打印/PDF 端强制换行 */
pre,
pre.codeblock,
pre code,
code,
kbd,
samp {
  white-space: pre-wrap;        /* 保留空白和缩进，但允许换行 */
  word-break: break-word;       /* 优先在单词边界换行 */
  overflow-wrap: anywhere;      /* 超长 token / URL / 路径 任意位置换行 */
  max-width: 100%;              /* 不允许超出父容器 */
  box-sizing: border-box;
}

pre,
pre.codeblock {
  width: 100%;
  overflow-x: auto;             /* 屏幕端兜底：极端情况仍可横滚 */
}

/* 打印/PDF 端：关掉所有横滚，强制 pre-wrap 生效 */
@media print {
  pre,
  pre.codeblock,
  pre code,
  code,
  kbd,
  samp {
    overflow: visible !important;
    overflow-x: visible !important;
    white-space: pre-wrap !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
    page-break-inside: auto;    /* 允许长代码跨页，不允许被裁 */
  }
}
```

**禁止**：
- 任何代码相关标签出现 `white-space: pre`（不带 `-wrap`），会直接导致 PDF 裁字
- 任何代码容器出现 `overflow: hidden` 或固定 `height`，会导致超出内容消失
- 用 `<pre>` 塞长 URL / 长命令时不加 `overflow-wrap: anywhere`

### 对齐自检清单

生成 HTML 后，自查以下项目：
- [ ] 所有 `<img>` 都有 `class="ebook-img"` 且居中
- [ ] 所有 `<table>` 都有 `width: 100%`
- [ ] **（硬铁律）所有 `<pre>`、`<code>`、`<kbd>`、`<samp>` 都带 `white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;`，并且 `@media print` 里 `overflow: visible !important`；不能出现 `white-space: pre`（不带 -wrap）、`overflow: hidden`、或固定 `height`**
- [ ] **（硬铁律）随手挑 2-3 段最长的代码块 / URL / 命令，在 PDF 里肉眼确认没有被右侧裁切**
- [ ] 没有元素的实际渲染宽度超出 `.content` 的 680px
- [ ] 图片、表格、代码块的左右边距视觉一致
- [ ] 提示框没有比正文更窄或更宽

---

## 分页规则

```css
/* 封面独占一页 */
.cover { page-break-after: always; }

/* 目录独占一页 */
.toc { page-break-after: always; }

/* 每章从新页开始 */
.chapter { page-break-before: always; }

/* 术语卡片不拆页 */
.term { page-break-inside: avoid; }

/* 末尾引导页从新页开始 */
.ending { page-break-before: always; }
```

---

## 间距体系

| 元素 | margin-bottom |
|------|-------------|
| 章节引言 (ch-intro) | 2rem |
| 术语块 (term) | 2.5rem |
| 术语分割线 (term-sep) | — (margin-top: 0.5rem) |
| 提示框 (tip) | 0.8rem top / 0.5rem bottom |
| 代码块 (codeblock) | 0.8rem top+bottom |
| 表格 | 1rem top+bottom |
| 图片 | 2rem top+bottom |

---

## 打印适配

```css
@page {
  size: A4;
  margin: 2.2cm 2cm 2.8cm 2cm;  /* 下方多留空间放页码 */
}
```

**页码实现方式**：

Chrome headless 的 `@page` CSS 计数器支持有限。页码通过以下两种方案实现：

**方案 A（推荐）：不加 `--print-to-pdf-no-header`，用 Chrome 默认页脚**

Chrome 默认页脚会显示页码。只需在 PDF 命令中**去掉** `--print-to-pdf-no-header` 和 `--no-pdf-header-footer`，Chrome 会自动在底部居中显示页码。默认格式：`1 / N`。

缺点：同时会显示日期和文件路径在页眉。

**方案 B（精确控制）：HTML 内嵌页码 + JavaScript**

在 HTML 底部加入 JavaScript 计数页码，配合 CSS fixed 定位：

```css
.page-number {
  position: fixed;
  bottom: 0.5cm;
  width: 100%;
  text-align: center;
  font-size: 0.75rem;
  color: #bbb;
}
```

由于 Chrome headless 对 CSS `counter(page)` 支持不完善，实际生产中建议 **方案 A**（接受默认页眉页脚），或在 HTML 末尾手动标注章节页码范围。

**如果用户不要页眉只要页码**：用 `--print-to-pdf-no-header` 去掉所有，然后在 HTML 里用 `position: fixed` 模拟页码（但此方案在长文档中页码不会自动递增，仅适合短文档）。

```css

@media print {
  body { font-size: 11pt; }
  .content { max-width: 100%; padding: 0; }

  /* 保留背景色 */
  .tip, th, pre.codeblock {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

## PDF 生成命令

**带页码版（默认）**：
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --print-to-pdf="输出路径.pdf" \
  "file:///HTML文件路径.html"
```
Chrome 默认页脚会显示居中页码（格式 `1/N`）。页眉会显示标题和日期。

**无页眉页脚版**：
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --print-to-pdf="输出路径.pdf" \
  --print-to-pdf-no-header \
  --no-pdf-header-footer \
  "file:///HTML文件路径.html"
```

**默认使用带页码版**，除非用户明确要求不要页码。
