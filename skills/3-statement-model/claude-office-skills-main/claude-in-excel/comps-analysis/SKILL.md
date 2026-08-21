---
name: comps-analysis
description: Build institutional-grade comparable company analyses with operating metrics, valuation multiples, and statistical benchmarking in Excel/spreadsheet format.
  Perfect for: Public company valuation, benchmarking, IPO pricing, outlier identification, IC presentations, sector overviews
  Not ideal for: Private companies without public peers, conglomerates, distressed/bankrupt, pre-revenue startups, unique business models
---

# Comparable Company Analysis

## Preflight: Dependency Check

Before starting, verify required libraries and tools are installed and install any that are missing.

```bash
python3 -c "import openpyxl" 2>/dev/null || python3 -m pip install openpyxl
command -v soffice >/dev/null 2>&1 || command -v libreoffice >/dev/null 2>&1 || ls /Applications/LibreOffice.app/Contents/MacOS/soffice >/dev/null 2>&1 || echo "WARNING: LibreOffice not found. Install: brew install --cask libreoffice (macOS) or apt install libreoffice (Linux). Required for scripts/recalc.py."
```

**Important**: Do not skip this step — `scripts/recalc.py` is required to verify quartile statistics and multiple-range sanity checks.

## Scripts

- `scripts/recalc.py` — Force formula recalculation via headless LibreOffice. Run after building: `python scripts/recalc.py <comps.xlsx>`

## ⚠️ CRITICAL: Data Source Priority (READ FIRST)
1. FIRST: Check for MCP data sources (S&P Kensho, FactSet, Daloopa)
2. DO NOT use web search if MCPs available
3. ONLY if MCPs unavailable: Bloomberg, SEC EDGAR
4. NEVER use web search as primary data source

## Overview
Institutional-grade comps combining operating metrics, valuation multiples, statistical benchmarking.

## Reference Material & Contextualization
- `comps_example.xlsx` (bundled in this skill directory) for structural hierarchy understanding
- DO use for: structure, rigor level, principles
- DO NOT use for: exact reproduction, copying without context
- ALWAYS ask: format preference? audience? key question? context?
- Adapt for: industry, sector, company familiarity, decision type

## ⚠️ Formulas Over Hardcodes + Step-by-Step Verification
- Office JS: range.formulas, not range.values
- Merged cell pitfall: value to top-left first
- Step-by-step: structure → raw inputs → operating metrics → valuation multiples → statistics

## Section 1: Document Structure & Setup
### Header Block (Rows 1-3): Title, Companies list, Date/Units
### Visual Convention Standards (OPTIONAL - user prefs override)
- Font: Times New Roman 11pt (data), 12pt (headers)
- Color Palette: Dark blue #1F4E79/#17365D (headers), Light blue #D9E1F2 (column headers), White (data), Light grey #F2F2F2 (statistics)
- Decimal precision: % 1 decimal, multiples 1 decimal, $ no decimals
- No borders (clean minimal appearance)
- All metrics center-aligned
- Uniform column widths + consistent row heights

## Section 2: Operating Statistics & Financial Metrics
### Core Columns: Company, Revenue, Revenue Growth, Gross Profit, Gross Margin, EBITDA, EBITDA Margin
### Optional: FCF, FCF Margin, Net Income, Operating Income, CapEx, Rule of 40, FCF Conversion
### Statistics Block: Maximum, 75th Percentile, Median, 25th Percentile, Minimum
- Statistics for comparable metrics (ratios, margins, multiples) — NOT size metrics (absolute $)
- One blank row between data and statistics — NO "SECTOR STATISTICS" header

## Section 3: Valuation Multiples & Investment Metrics
### Core: Company, Market Cap, Enterprise Value, EV/Revenue, EV/EBITDA, P/E
### Optional: FCF Yield, PEG Ratio, Price/Book, ROE/ROA, CAGR, Asset Turnover, Debt/Equity
### Cross-Reference Rule: Multiples MUST reference operating metrics section
### Statistics Block: Same structure (Max, 75th, Med, 25th, Min)

## Section 4: Notes & Methodology Documentation
- Data Sources & Quality, Key Definitions, Valuation Methodology, Analysis Framework

## Section 5: Choosing the Right Metrics (Decision Framework)
- "Which is undervalued?" → EV/Rev, EV/EBITDA, P/E
- "Which is most efficient?" → margins
- "Which is growing fastest?" → growth rates
- "Which generates most cash?" → FCF metrics
### Industry-Specific: SaaS, Manufacturing, Financial Services, Retail
### The "5-10 Rule": 5 operating + 5 valuation = 10 total

## Section 6: Best Practices & Quality Checks
- Cell comments on ALL hard-coded inputs (source OR assumption)
- Sanity: Gross > EBITDA > Net margin
- Multiple ranges: EV/Rev 0.5-20x, EV/EBITDA 8-25x, P/E 10-50x
### Common Mistakes: mixing market cap/EV, inconsistent periods, hardcodes without comments

## Section 6 (Advanced): Dynamic Headers, Quartile Analysis, Industry Modifications

## Section 7: Workflow & Practical Tips
1. Set up structure (30min) → 2. Gather data (60-90min) → 3. Build formulas (30min) → 4. Add statistics (15min) → 5. Quality control (30min) → 6. Documentation (15min)

## Section 8: Example Template Layout (Simple ASCII art grid)

## Section 9: Industry-Specific Additions (Optional)
SaaS, Financial Services, E-commerce, Healthcare, Manufacturing

## Section 10: Red Flags & Warning Signs
Data quality, valuation, comparability issues

## Section 11: Formulas Reference Guide
Statistical + Financial + Cross-Sheet + Formatting formulas

## Key Principles Summary (7 points)

## Output Checklist (~15 items)
