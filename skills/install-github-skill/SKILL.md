---
name: install-github-skill
description: 从 GitHub 仓库安装 Skill 到 Abu 工具箱的完整操作流程，包括仓库结构检查、安装方式选择、网络问题处理和安装验证。当用户要求从 GitHub 安装/导入某个 skill、从开源仓库安装技能到 Abu 时使用。
trigger: 用户要求从 GitHub 安装 skill、从开源仓库导入技能、安装某个 GitHub 仓库里的 skill 到 Abu
---

# 从 GitHub 安装 Skill 到 Abu

把 GitHub 上的开源 Skill（Claude Agent Skills）安装到 Abu 工具箱（`%USERPROFILE%\.abu\skills\`）。

## 前置知识

### Skill 结构
- 核心文件是 `SKILL.md`，开头 YAML frontmatter 必须含 `name` 和 `description`
- 可选资源：`scripts/`、`references/`、`templates/`、`LICENSE` 等，随技能一起安装
- frontmatter 的 `name:` 是技能名（小写、连字符），安装后目录名以它为准

### 安装方式对比
| 方式 | 可用性 | 说明 |
|---|---|---|
| A. 管理工具 + GitHub 链接 | ✅ 推荐 | 直接下载注册，最省事 |
| B. 手动下载复制 | ✅ 备选 | 网络受限时用，完全可控 |
| C. 管理工具 + 本地路径 | ❌ 不支持 | 报 "not found in registry"，勿尝试 |

## 步骤

### 第 1 步：确认仓库结构
先看仓库根目录或 `skills/` 子目录下有没有 `SKILL.md`，且 frontmatter 含 `name` 和 `description`。

查看仓库文件树（无需登录，优先用 jsdelivr，因为 `api.github.com` 常被网络拦截）：
```
https://data.jsdelivr.com/v1/packages/gh/{用户}/{仓库}@main?structure=flat
```
备选：`https://github.com/{用户}/{仓库}/tree/main`

### 第 2 步：对比已有技能，避免重复安装
列出 Abu 已装技能，检查同名/同功能是否已存在：
```powershell
Get-ChildItem "$env:USERPROFILE\.abu\skills" -Directory | ForEach-Object { $_.Name }
```
内置技能注意：docx / pdf / pptx / xlsx、algorithmic-art、brand-guidelines、canvas-design、doc-coauthoring、frontend-design、internal-comms、mcp-builder、skill-creator、theme-factory、web-artifacts-builder、webapp-testing、slack-gif-creator 等。
同名或同功能的直接跳过安装，告知用户已内置即可。

### 第 3 步：安装
**方式 A（推荐）：管理工具直接安装**

先用 GitHub 标准链接：
```
source = https://github.com/{用户}/{仓库}
```

若报错 `Failed to download tarball`（archive 域名被拦截），改用 codeload 镜像链接：
```
source = https://codeload.github.com/{用户}/{仓库}/zip/refs/heads/main
```

**方式 B（备选）：手动下载复制**
1. 下载：浏览器访问仓库 → Code → Download ZIP；或命令行用 Python（比 PowerShell 稳）：
```python
import urllib.request
urllib.request.urlretrieve('https://codeload.github.com/{用户}/{仓库}/zip/refs/heads/main', '{仓库}.zip')
```
2. 解压用 Python（PowerShell Expand-Archive 在受限模式下会报错）：
```python
import zipfile
with zipfile.ZipFile('{仓库}.zip') as z:
    z.extractall('.')
```
3. 解压后通常多一层 `{仓库}-main/`，把**含 SKILL.md 的那一层**复制到 `%USERPROFILE%\.abu\skills\{技能名}\`（技能名以 SKILL.md 的 `name:` 为准）。

### 第 4 步：验证
- 确认技能目录存在且包含 SKILL.md 和全部资源文件
- 用户可在对话中提一句相关需求，验证技能能触发

## 常见问题速查

| 问题 | 现象 | 解决 |
|---|---|---|
| GitHub API 被拦 | api.github.com 请求失败 | 用 data.jsdelivr.com 文件树 API 查看结构 |
| archive 下载被拦 | "Failed to download tarball" | source 换成 codeload.github.com 链接 |
| 本地路径装不上 | "not found in registry" | 手动复制到 .abu\skills\，或从 GitHub 链接装 |
| PowerShell 解压报错 | ConstrainedLanguage 限制 | 用 Python zipfile 解压 |
| 与内置技能重名 | 冲突或覆盖 | 先对比内置技能，必要时跳过或改名 |
| 仓库含多个技能 | 根目录无 SKILL.md | 技能在 skills/ 子目录，逐个安装或手动复制 |

## 安装后检查清单
- [ ] `%USERPROFILE%\.abu\skills\{技能名}\SKILL.md` 存在
- [ ] SKILL.md frontmatter 的 `name:` 与目录名一致
- [ ] 资源文件（scripts/templates/references）齐全
