---
name: educational-html-visualization
description: 将理论/教材/学习内容转化为结构清晰、视觉友好的教育型HTML可视化文件。从内容分析、结构拆解、视觉元素匹配到完整HTML渲染，输出可直接在浏览器中打开的教学示意图。
trigger: 用户要求将某个理论/概念/教材内容做成HTML格式的图、可视化、教学示意图，或要求生成类似之前某HTML文件风格的图
---

# 教育型HTML可视化生成工作流

## 适用场景
将理论性、概念性、教材类内容转化为结构清晰的教育型HTML可视化文件。适用于：
- 政治经济学、哲学、历史等理论学科的教学内容
- 需要通过步骤分解、对比表格、流程图等方式呈现的知识
- 需要输出为独立HTML文件（可保存、可分享、可打印）的场景

## 核心原则
1. **内容驱动**：先理解内容结构，再匹配视觉形式，不为了好看而牺牲准确性
2. **实事求是**：理论内容保持原文原意，不做过度简化或歪曲
3. **结构优先**：每个模块必须有清晰的逻辑层次（公式→概念→分解→对比→总结）
4. **自包含**：HTML文件零外部依赖，纯CSS+HTML即可渲染
5. **白底样式**：因是独立文件，使用浅色/白色背景，不用主题变量

## 工作流步骤

### Step 1：内容分析（吃透原文）
- 通读用户提供的理论内容，标注出：
  - **核心公式/定义**（如：工作日=必要劳动+剩余劳动）
  - **概念要素**（需要拆解的组成部分）
  - **逻辑链条**（因果关系、步骤顺序）
  - **对比维度**（相似概念之间的差异）
  - **案例/举例**（帮助理解的具体例子）
  - **总结性结论**（最后的升华）

### Step 2：结构拆解（确定模块）
将内容拆分为标准模块，按以下顺序排列（可缺省）：

| 模块 | 适用内容 | 视觉形式 |
|---|---|---|
| ① 核心公式/定义 | 有数学公式或一句话定义 | 公式卡片（formula-box） |
| ② 概念分解 | 需要拆解为若干组成部分 | 步骤条（step-row）或时间条 |
| ③ 逻辑流程 | 有因果关系/先后顺序 | 流程图（flow-chain）或箭头步骤 |
| ④ 对比分析 | 多个相似概念需要对比 | 对比表（compare-table）或两列卡片 |
| ⑤ 详细展开 | 每个概念需要单独说明 | 左右两栏卡片（wide-row） |
| ⑥ 总结 | 收束全文 | 总结框（summary） |

### Step 3：视觉元素匹配（每种内容的"最佳呈现方式"）

根据内容类型选择对应的HTML结构：

**（1）公式类 → 公式卡片（formula-box）**
- 主公式用大字号+红色，副公式用蓝色
- 下方用图例（legend）解释每个符号的含义
- 示例：`工作日＝必要劳动时间＋剩余劳动时间`

**（2）步骤流程类 → 步骤条（step-row）**
- 每个步骤用编号圆圈①→②→③
- 水平排列，中间用箭头"→"连接
- 每个步骤包含：标题（h3）+ 一句话说明（p）
- 移动端自动竖排

**（3）时间/数量分解类 → 彩色时间条（day-block）**
- 用不同颜色的条形块表示不同部分
- 大字号显示数值，下方标注名称
- 底部用图例说明颜色含义
- 示例：4h必要劳动（橙色）+ 4h剩余劳动（红色）

**（4）对比类 → 对比表（compare-table）**
- 蓝色表头（#1f4e79）+ 白色文字
- 奇数行白色、偶数行浅灰背景
- 第一列用彩色加粗文字区分类型

**（5）详细展开类 → 两列卡片（wide-row）**
- 左侧用彩色边框标识（border-left: 3px solid）
- 内部可嵌套小时间条或小图表
- 底部加注释说明

**（6）流程链条类 → 流程图（flow-chain）**
- flow-node水平排列，flow-arrow箭头连接
- 关键节点高亮（highlight类）
- 移动端自动竖排

**（7）总结类 → 总结框（summary）**
- 深蓝背景（#1f4e79）+ 白色文字
- 关键术语用高亮色（#f5d76e金色）
- 分段用<br>分隔

### Step 4：HTML渲染（套用模板）

用 write_file 生成完整的HTML文件。文件结构：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>页面标题</title>
  <style>
    /* 全局样式 */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f5f5f5; font-family: 'Segoe UI', 'PingFang SC', system-ui, sans-serif; }
    .c {
      max-width: 780px; margin: 0 auto; background: #fff;
      color: #1a1a2e; padding: 32px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    /* 标题样式 */
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px 0; }
    .sub { font-size: 13px; color: #888; ... }
    /* 章节标题 */
    .section-title { font-size: 16px; font-weight: 700; margin: 28px 0 14px 0; display: flex; align-items: center; gap: 8px; }
    .section-title .num { /* 圆形编号 */ }
    .num-red { background: #c0392b; }
    .num-orange { background: #d35400; }
    .num-green { background: #1e8449; }
    .num-blue { background: #1f4e79; }
    /* 标签 */
    .tag { ... }
    .tag-red { background: #fde8e8; color: #c0392b; }
    .tag-orange { background: #fef3e2; color: #d35400; }
    .tag-green { background: #e8f8e8; color: #1e8449; }
    .tag-blue { background: #e8f0fe; color: #1f4e79; }
    /* 核心组件 */
    .formula-box { ... }          /* 公式卡片 */
    .step-row { ... }             /* 步骤条 */
    .step { ... }                 /* 步骤节点 */
    .arrow-big { ... }            /* 大箭头 */
    .day-row { ... }              /* 时间条 */
    .day-block { ... }            /* 时间块 */
    .wide-row { ... }             /* 两列 */
    .card { ... }                 /* 内容卡片 */
    .flow-chain { ... }           /* 流程链条 */
    .flow-node { ... }            /* 流程节点 */
    .compare-table { ... }        /* 对比表 */
    .summary { ... }              /* 总结框 */
    /* 响应式 */
    @media (max-width: 600px) {
      .step-row, .flow-chain { flex-direction: column; }
      .arrow-big, .flow-arrow { transform: rotate(90deg); }
      .wide-row, .day-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
<div class="c">

  <!-- 封面 -->
  <h1>标题</h1>
  <div class="sub">副标题</div>

  <!-- 模块1：核心公式/定义 -->
  <!-- 模块2：概念分解/步骤 -->
  <!-- 模块3：对比分析/表格 -->
  <!-- 模块4：分类展开/两列 -->
  <!-- 模块5：流程链条 -->
  <!-- 模块6：总结 -->

</div>
</body>
</html>
```

### Step 5：验证与交付
- 确认HTML文件可正常打开渲染
- 检查内容完整：所有原文要点是否都已涵盖
- 检查视觉一致性：颜色体系、间距、对齐
- 响应式测试：移动端是否自动转为竖排
- 文件名规范：`主题关键词-随机后缀.html`

## 注意事项
- 独立HTML文件必须使用白底/浅色背景，不能使用主题变量（--w-*）
- 颜色体系固定：红色(#c0392b)表示核心、橙色(#d35400)表示分解、绿色(#1e8449)表示变革、蓝色(#1f4e79)表示高级/理论
- 标签(tag)颜色与对应模块颜色一致
- 所有内容必须基于原文，不自行添加原文没有的内容
- 复杂概念必须先拆解再组合，不要一次性输出大段文字
- 移动端适配必不可少，flex-direction: column 是最常用的方案
- 文件名后缀使用随机字符串（如 -mscxsv12），避免中文文件名乱码问题