# SEC Filings Data Extraction Reference

**When to Use:** Only reference this file when a model template specifically requires pulling data from SEC filings (10-K, 10-Q).

---

## Extracting Data from SEC Filings (10-K / 10-Q)

### Step 1: Locate the Filing
1. Use SEC EDGAR: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=[TICKER]&type=10-K`
2. For quarterly data, use `type=10-Q`

### Step 2: Identify Filing Currency
- Check the cover page or header for reporting currency
- Look at statement headers (e.g., "in thousands of U.S. dollars")
- Review Note 1 (Summary of Significant Accounting Policies)

| Indicator | Currency |
|-----------|----------|
| $, USD | US Dollar |
| €, EUR | Euro |
| £, GBP | British Pound |
| ¥, JPY | Japanese Yen |
| ¥, CNY, RMB | Chinese Yuan |
| CHF | Swiss Franc |
| CAD, C$ | Canadian Dollar |

### Step 3: Navigate to Financial Statements
- **Item 8** (10-K) or **Item 1** (10-Q): Financial Statements
- Key sections: Consolidated Statements of Operations, Balance Sheets, Cash Flows, Notes

### Step 4: Data Extraction Mapping

**Income Statement**

| Filing Line Item | Model Line Item |
|------------------|-----------------|
| Net revenues / Net sales | Revenue |
| Cost of goods sold | COGS |
| Selling, general and administrative | SG&A |
| Depreciation and amortization | D&A |
| Interest expense, net | Interest Expense |
| Income tax expense | Taxes |
| Net income | Net Income |

**Balance Sheet**

| Filing Line Item | Model Line Item |
|------------------|-----------------|
| Cash and cash equivalents | Cash |
| Accounts receivable, net | AR |
| Inventories | Inventory |
| Property, plant and equipment, net | PP&E (Net) |
| Total assets | Total Assets |
| Accounts payable | AP |
| Short-term debt / Current portion of LT debt | Current Debt |
| Long-term debt | LT Debt |
| Retained earnings | Retained Earnings |
| Total stockholders' equity | Total Equity |

**Cash Flow Statement**

| Filing Line Item | Model Line Item |
|------------------|-----------------|
| Net income | Net Income |
| Depreciation and amortization | D&A |
| Changes in accounts receivable | ΔAR |
| Changes in inventories | ΔInventory |
| Changes in accounts payable | ΔAP |
| Capital expenditures | CapEx |
| Proceeds from issuance of common stock | Equity Issuance |
| Proceeds from / Repayments of debt | Debt activity |
| Dividends paid | Dividends |

### Step 5: Extract Supporting Detail from Notes
- **Note: Debt** → Maturity schedule, interest rates, covenants
- **Note: PP&E** → Gross PP&E, accumulated depreciation, useful lives
- **Note: Revenue** → Segment breakdowns, geographic splits
- **Note: Leases** → Operating vs. finance lease obligations

### Step 6: Historical Data Requirements
- Extract 3 years of historical data minimum
- 10-K provides 3 years of IS/CF, 2 years of BS
- For 3rd year BS, pull from prior year's 10-K
- Use 10-Qs for quarterly granularity if needed

### Data Extraction Checklist
- [ ] Identify reporting currency and scale
- [ ] 3 years historical Income Statement
- [ ] 3 years historical Cash Flow Statement
- [ ] 3 years historical Balance Sheet
- [ ] Verify IS Net Income = CF starting Net Income
- [ ] Verify BS Cash = CF Ending Cash
- [ ] Extract debt maturity schedule from notes
- [ ] Extract D&A detail or useful life assumptions
- [ ] Note any non-recurring / one-time items to normalize
