# Phase 18: Reports Management Documentation

## Farm Management System (AgriCore)

---

## 1. Executive Summary & Objective

The objective of **Phase 18: Reports Management** is to provide an enterprise-grade reporting engine and an intuitive UI allowing farm owners and agricultural managers to generate, inspect, filter, and export professional reports across agronomic operations, workforce payroll, machinery assets, and financial telemetry.

All reports are dynamically computed from actual PostgreSQL database records, enforcing multi-tenant isolation, decimal-safe monetary calculations, and role-based permissions.

---

## 2. Implemented Report Categories (12 Categories)

| # | Category | Key Metrics & Data Extracted | Models Reused |
|---|---|---|---|
| **A** | **Farm Summary Report** | Landholding acreage, cultivated field plots, soil and irrigation types, active crops, workforce on duty, and activity count. | `Farm`, `Field`, `Crop`, `Labour`, `FarmCalendarEvent` |
| **B** | **Crop Report** | Crop varieties, seasonal schedules, sowing dates, actual/expected harvest dates, growth status, planted areas, and recorded yield outputs. | `Crop`, `Field`, `Farm`, `Harvest` |
| **C** | **Labour Report** | Workforce registry, trade specializations, contact information, daily wages, attendance rates, working hours, and earned wages. | `Labour`, `Farm`, `Attendance`, `SalaryRecord` |
| **D** | **Attendance Report** | Daily check-in/out timestamps, hours worked, overtime logs, attendance percentages, and presence states (`present`, `absent`, `half_day`, `leave`). | `Attendance`, `Labour`, `Farm` |
| **E** | **Salary & Payment Report** | Historical wage snapshots, present/half/absent days, gross earnings, net salary, cash disbursements, and outstanding liabilities (unpaid salary is never treated as paid). | `SalaryRecord`, `SalaryPayment`, `Labour`, `Farm` |
| **F** | **Fertilizer & Pesticide Report** | Agrochemical input applications, product classifications, applied dosages, units, application methods, purpose, and financial expenditures. | `AgriculturalApplication`, `Farm`, `Field`, `Crop` |
| **G** | **Irrigation Report** | Water source utilization, pump runtimes, drip/sprinkler methods, irrigation durations, and plot coverage. | `FarmCalendarEvent`, `Field`, `Farm` |
| **H** | **Expense Report** | Classified operational costs (seeds, fertilizer, fuel, labour, repairs), payment status, vendor ledgers, and category-wise percentage breakdowns. | `Expense`, `ExpensePayment`, `Farm`, `Field` |
| **I** | **Machinery & Equipment Report** | Equipment registry, operational statuses (`available`, `in_use`, `under_maintenance`, `retired`), physical conditions, serial numbers, asset valuations, and maintenance histories. | `Equipment`, `EquipmentMaintenance`, `Farm` |
| **J** | **Harvest Report** | Yield outputs, measurement units (kg, tonnes, quintals), quality grading (Grade A, Grade B, Standard), harvest methods, and storage facilities. | `Harvest`, `Crop`, `Field`, `Farm` |
| **K** | **Sales & Income Report** | Produce sales invoices after discounts, customer accounts, received payments, outstanding receivables, and non-crop other incomes (subsidies, leases). | `Sale`, `OtherIncome`, `Farm`, `Crop` |
| **L** | **Financial Summary Report (P&L)** | Authoritative profit & loss statement: Gross Income, Total Operating Expenses, Net Profit/Loss, Margin %, and Monthly Timeline breakdown. | `Sale`, `OtherIncome`, `Expense`, `Farm` |

---

## 3. Authoritative Financial Calculation Logic

Strictly adheres to the calculation rules established in Phase 15 and Phase 17:

$$\text{Total Sales Revenue} = \sum (\text{Sale.total\_amount})$$
*(where `total_amount` is the final sale price strictly after deducting discounts)*

$$\text{Total Income} = \text{Total Sales Revenue} + \text{Total Other Income}$$

$$\text{Recorded Profit / Loss} = \text{Total Income} - \text{Total Expenses}$$

$$\text{Profit Margin \%} = \left(\frac{\text{Recorded Profit / Loss}}{\text{Total Income}}\right) \times 100 \quad (\text{if Total Income} > 0)$$

### Security and Financial Integrity Rules:
- **No Cash Basis Double Counting:** Uncollected produce sale balances are tracked as `outstanding_receivables` and never treated as received cash.
- **Unpaid Wage Isolation:** Unpaid labour salary balances remain under `outstanding_balance` and are never counted as disbursements.
- **Decimal Safety:** All calculations employ Python `Decimal` objects quantized to two decimal places (`0.01`).

---

## 4. Architecture & Reused Database Models

```
┌─────────────────────────────────────────────────────────────┐
│                       Next.js Frontend                      │
│     /reports (DashboardLayout + PageHeader + Filters)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON / Binary Blobs
┌──────────────────────────────▼──────────────────────────────┐
│                       FastAPI Backend                       │
│    app/routes/reports.py  ───►  app/services/report_service │
│                           ───►  app/services/pdf_export     │
│                           ───►  app/services/excel_export   │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLAlchemy 2.0 ORM
┌──────────────────────────────▼──────────────────────────────┐
│                    PostgreSQL / SQLite                      │
│   farms, fields, crops, labour, attendance, salaries,       │
│   applications, expenses, equipment, harvests, sales,       │
│   other_incomes, farm_calendar_events                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Backend API Endpoints

All endpoints are mounted under the `/api/reports` prefix with JWT authentication and local development demo fallback:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reports/overview` | Returns aggregate summary cards (categories, farms, income, expenses, net profit/loss). |
| `GET` | `/api/reports/preview` | Universal preview dispatcher returning headers, summary cards, and dynamic rows for interactive tables. |
| `GET` | `/api/reports/farm-summary` | Farm Summary Report data. |
| `GET` | `/api/reports/crops` | Crop Cultivation & Harvest Report data. |
| `GET` | `/api/reports/labour` | Labour & Workforce Report data. |
| `GET` | `/api/reports/attendance` | Workforce Attendance Report data. |
| `GET` | `/api/reports/salaries` | Salary & Wage Payment Report data. |
| `GET` | `/api/reports/fertilizer-pesticide` | Fertilizer & Pesticide Application Report data. |
| `GET` | `/api/reports/irrigation` | Irrigation & Water Management Report data. |
| `GET` | `/api/reports/expenses` | Farm Operational Expense Report data. |
| `GET` | `/api/reports/machinery` | Machinery & Equipment Asset Report data. |
| `GET` | `/api/reports/harvest` | Crop Harvest & Yield Report data. |
| `GET` | `/api/reports/sales-income` | Produce Sales & Auxiliary Farm Income Report data. |
| `GET` | `/api/reports/financial-summary` | Authoritative Profit & Loss Statement with monthly breakdowns. |
| `GET` | `/api/reports/export/pdf` | Compiles requested dataset into a publication-grade PDF file (`application/pdf`). |
| `GET` | `/api/reports/export/excel` | Compiles requested dataset into a formatted Excel spreadsheet (`.xlsx`). |

---

## 6. Report Filtering System

Filters apply directly to backend database queries:

1. **Date Range Presets:**
   - `today`
   - `last_7_days`
   - `last_30_days`
   - `this_month`
   - `previous_month`
   - `this_year`
   - `all_time`
   - `custom`
2. **Chronological Boundary Validation:**
   - Ensures `start_date <= end_date`. If `start_date > end_date`, returns HTTP 400 Bad Request with a clear validation error.
3. **Estate Filtering & Multi-Tenant IDOR Security:**
   - Filters records by `farm_id`. If a user attempts to access an estate owned by another tenant, the request is strictly rejected with HTTP 404 Not Found.
4. **Contextual Entity Filters:**
   - Field plots (`field_id`)
   - Crop cycles (`crop_id`)
   - Workforce workers (`labour_id`)
   - Chemical/expense categories (`expense_category`)
   - Workflow statuses (`status`)

---

## 7. PDF and Excel Export Architecture

### PDF Export (`app/services/pdf_export_service.py`):
- Powered by `ReportLab`.
- Landscape A4 page format optimized for wide agricultural data tables.
- Styled header with AgriCore branding, report title, target farm estate, and UTC generation timestamp.
- KPI summary box with primary financial or operational indicators.
- Auto-wrapped table cells (`Paragraph`) with forest green headers (`#1b4332`), white bold text, and alternating zebra rows (`#f8fafc`).
- Two-pass `NumberedCanvas` generating dynamic "Page X of Y" footers with timestamps.

### Excel Export (`app/services/excel_export_service.py`):
- Powered by `OpenPyXL`.
- Styled banner with report metadata and summary metrics.
- Formatted columns:
  - Currency values formatted as `₹#,##0.00`
  - Dates formatted as `YYYY-MM-DD`
  - Auto-fitted column widths preventing text truncation.
- Double-border summary and totals row.

---

## 8. Frontend Implementation

### Dedicated Page Route:
`/reports`

### UI Components (`frontend/components/reports/`):
1. **`ReportOverviewCards.tsx`:** Top KPI cards displaying total categories, available farms, total income, total expenses, and a net profit/loss status badge.
2. **`ReportCategorySelector.tsx`:** Filterable category tabs grouped into Operations, Workforce, and Finance & Assets.
3. **`ReportFilterBar.tsx`:** Farm estate selector, date preset buttons, custom date range pickers, contextual field/status dropdowns, "Generate Report" button, and "Clear Filters" button.
4. **`ReportPreviewTable.tsx`:** Interactive data table displaying live records, real-time client-side search, status badges, currency formatting, and one-click "Download PDF" and "Download Excel" buttons.

---

## 9. Verification & Automated Test Results

A test suite (`backend/test_reports.py`) was executed:

```
=================================================================
 Running Phase 18 Reports Management Automated Test Suite
=================================================================
[PASS] In-memory database schema initialized
[PASS] Tenant Alice and Tenant Bob registered and authenticated
[PASS] Full domain test records registered for Alice
[PASS] Unauthenticated access blocked on all reports endpoints (HTTP 401)
[PASS] Authoritative Reports Overview telemetry & financial calculations verified
[PASS] All 12 report category API endpoints return verified real database data
[PASS] Date filtering and boundary validation (HTTP 400) verified
[PASS] Farm filtering and cross-user IDOR access rejection (HTTP 404) verified
[PASS] Tenant Bob data isolation verified (zero leak from Tenant Alice)
[PASS] Unified preview table generator verified
[PASS] PDF export generated successfully (3090 bytes, header=%PDF-)
[PASS] Excel export generated successfully (5652 bytes, header=PK)
=================================================================
 ALL 12 PHASE 18 REPORTS MANAGEMENT TESTS PASSED (100%)
=================================================================
```

Existing Phase 17 test suite (`backend/test_dashboard.py`):
```
=================================================================
 ALL 9 PHASE 17 DASHBOARD ANALYTICS TESTS PASSED (100%)
=================================================================
```

Frontend compilation test:
```
✓ Next.js build completed with exit code 0
✓ Route /reports statically compiled and generated (8.36 kB)
```

Live system test:
- Backend running on `http://127.0.0.1:8000` (Healthy, SQLite / PostgreSQL connected)
- Real database records verified:
  - Total Income: ₹2,25,500.00
  - Total Expenses: ₹1,17,720.00
  - Net Profit: ₹1,07,780.00 (Margin: 47.8%)
- Next.js frontend running on `http://localhost:3000`

---

## 10. How to Run & Use the Reports Module

### 1. Start Backend:
```bash
cd backend
..\backend\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Start Frontend:
```bash
cd frontend
npm run dev
```

### 3. Open in Browser:
Navigate to:
`http://localhost:3000/reports`

- Browse across all 12 report categories.
- Filter by farm or reporting period presets.
- Click **Generate Report** to update the preview.
- Click **Download PDF** or **Download Excel** to export publication-ready reports.

