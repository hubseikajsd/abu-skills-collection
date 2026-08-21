# CLI-Anything WPS Office

通过命令行操控 WPS Office 的 CLI harness（Windows COM 自动化）。

## 系统要求

- Windows 10/11
- WPS Office 12.0+（家庭和学生版或专业版）
- Python 3.10+
- pywin32

## 安装

```bash
cd agent-harness
pip install -e .
```

## 验证安装

```bash
cli-anything-wps --help
```

## 快速开始

```bash
# 创建文档
cli-anything-wps document new --type writer --name "测试"

# 添加内容
cli-anything-wps writer add-paragraph -t "Hello WPS!"

# 导出
cli-anything-wps export render output.docx -p docx

# 交互式 REPL
cli-anything-wps
```

## 运行测试

```bash
pip install -e .[dev]
python -m pytest cli_anything/wps/tests/ -v
```

## 架构

```
CLI 命令 → Session（会话状态）→ Core 模块（数据操作）
    │
    └── Export → WPS COM 自动化 → 输出文件（DOCX/XLSX/PPTX/PDF）
```

### COM ProgID

| ProgID | 应用 |
|--------|------|
| KWPS.Application | WPS 文字 |
| KET.Application | WPS 表格 |
| KWPP.Application | WPS 演示 |
