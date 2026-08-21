# WPS Office CLI Harness — Architecture Analysis

## Software Profile

- **Name:** WPS Office (Kingsoft Office)
- **Type:** Closed-source commercial office suite
- **Platform:** Windows-only (COM automation)
- **Components:** Writer (Word), Calc (Excel), Impress (PowerPoint)
- **Automation Interface:** COM (Component Object Model), VBA-compatible

## COM ProgIDs

| ProgID | Application | Microsoft Equivalent |
|--------|-------------|---------------------|
| `KWPS.Application` | WPS Writer | Word.Application |
| `KET.Application` | WPS Calc | Excel.Application |
| `KWPP.Application` | WPS Impress | PowerPoint.Application |

## Architecture Decision: COM Automation (not ODF middleware)

Unlike LibreOffice which uses `--headless --convert-to` subprocess, WPS has a full COM automation interface:

- **Document creation:** Direct COM object creation (Documents.Add, Workbooks.Add, Presentations.Add)
- **Content editing:** COM API calls (Range.Text, Cells.Value, Slides.Add)
- **Format export:** Native SaveAs2/ExportAsFixedFormat methods
- **No intermediate format needed** (unlike LibreOffice ODF approach)

## Key Design Choices

1. **Stateful JSON project model** — All document state serialized as JSON, enabling undo/redo and session management
2. **Thin CLI + thick backend** — Click CLI handles parsing, core modules handle logic, wps_backend.py handles COM
3. **Pillow fallback for rendering** — When GIMP/WPS backend unavailable, Pillow provides basic rendering
4. **REPL-first UX** — invoke_without_command=True enters interactive mode by default

## Limitations

- Windows-only (COM interface requirement)
- Requires WPS Office installation
- Some VBA methods behave differently in WPS vs MS Office
- COM process cleanup required (WPS doesn't auto-quit)
