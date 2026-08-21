# Contributing to cli-anything-wps

## Setup

```bash
pip install -e .
pip install -e .[dev]
```

## Run Tests

```bash
python -m pytest cli_anything/wps/tests/ -v
```

## Architecture

```
cli_anything/wps/
├── wps_cli.py          # CLI entry (Click + REPL)
├── core/               # Business logic
│   ├── document.py     # Document CRUD
│   ├── writer.py       # Writer (word processing)
│   ├── calc.py         # Calc (spreadsheet)
│   ├── impress.py      # Impress (presentation)
│   ├── styles.py       # Style management
│   ├── export.py       # WPS COM export pipeline
│   └── session.py      # Session + undo/redo
├── utils/
│   ├── wps_backend.py  # WPS COM backend
│   └── repl_skin.py    # Terminal UI
├── tests/
│   └── test_core.py    # Unit tests (58 tests)
└── skills/
    └── SKILL.md        # Agent instruction doc
```

## How It Works

The harness uses WPS Office's COM automation interface (pywin32) to control WPS Writer/Calc/Impress programmatically.

Three COM ProgIDs:
- `KWPS.Application` → WPS Writer (Word-compatible)
- `KET.Application` → WPS Calc (Excel-compatible)
- `KWPP.Application` → WPS Impress (PowerPoint-compatible)
