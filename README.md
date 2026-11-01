# Farm Management System (AgriCore)

> A modern, full-stack, enterprise-grade Farm Management Web Application designed to empower farmers with digital management of crops, labour, attendance, wages, fertilizer/pesticide inputs, irrigation, machinery, expenses, harvest, sales, and analytics.

---

## 🏛️ System Architecture

```text
Next.js 14 (TypeScript + Tailwind CSS + Lucide + Recharts)
                            ↓ [REST API]
              FastAPI (Python 3.10+ / Pydantic v2)
                            ↓ [SQLAlchemy 2.0]
                   PostgreSQL 16 Relational DB
```

---

## 📂 Project Structure

```text
farm-management-system/
├── frontend/                     # Next.js 14 Client Application
│   ├── app/                      # App Router (pages, layout, styles)
│   │   ├── globals.css           # Custom theme variables & Tailwind directives
│   │   ├── layout.tsx            # Root HTML layout with viewport & metadata
│   │   └── page.tsx              # Phase 1 Architecture & Telemetry Control Center
│   ├── components/               # Reusable component library
│   │   ├── layout/               # AppLayout, Header, Sidebar
│   │   ├── common/               # Header, Sidebar navigation
│   │   └── ui/                   # Button, Card, Badge primitives
│   ├── hooks/                    # Custom React hooks (useHealth)
│   ├── lib/                      # Core utilities (ApiClient, cn, formatters)
│   ├── types/                    # Normalized TypeScript definitions for all domains
│   ├── services/                 # Decoupled service layer (systemService)
│   ├── utils/                    # Utility re-exports
│   ├── tailwind.config.ts        # Earthy agricultural palette tokens
│   ├── tsconfig.json             # Path aliasing (@/*)
│   ├── package.json              # Client dependencies
│   ├── .env.example              # Frontend environment template
│   └── .env.local                # Frontend local environment configuration
├── backend/                      # Python FastAPI REST API
│   ├── app/
│   │   ├── main.py               # Application factory, CORS, exception handlers
│   │   ├── core/                 # Core settings, security, and configuration
│   │   │   ├── __init__.py
│   │   │   └── config.py         # Pydantic Settings & environment parsing
│   │   ├── config.py             # Re-export for backward compatibility
│   │   ├── database/             # SQLAlchemy Engine, SessionLocal & Base
│   │   │   ├── base.py           # Declarative base & Timestamp mixin
│   │   │   └── session.py        # Transactional session dependency & health checker
│   │   ├── models/               # SQLAlchemy ORM models (Phase 2 target)
│   │   ├── schemas/              # Pydantic request/response validation
│   │   │   └── common.py         # Standardized API response envelopes
│   │   ├── routes/               # API endpoint routers
│   │   │   └── api.py            # Master /api router (/health, /info)
│   │   ├── services/             # Business logic service layer
│   │   └── utils/                # Helper utilities
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Backend environment template
│   └── .env                      # Backend runtime configuration
├── docker-compose.yml            # PostgreSQL 16 & pgAdmin 4 container stack
├── check.py                      # Development environment diagnostic tool
├── run.bat                       # Windows interactive launcher script
├── .env.example                  # Root environment configuration template
├── .gitignore                    # Git exclusions
└── README.md                     # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+
- **Python**: 3.10+
- **PostgreSQL** or **Docker**

Run the diagnostic tool to check your environment:
```bash
python check.py
```

---

### 2. Database Setup (PostgreSQL)

You can launch a local PostgreSQL container using Docker Compose:
```bash
docker-compose up -d
```
- **PostgreSQL Host**: `localhost:5432`
- **Database**: `farm_db`
- **Username**: `postgres`
- **Password**: `postgres`
- **pgAdmin 4**: `http://localhost:5050` (Email: `admin@farm.local`, Password: `admin`)

---

### 3. Backend Setup (FastAPI)

1. Open a terminal in the `backend/` directory:
```bash
cd backend
```

2. Create and activate a Python virtual environment:
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

3. Install backend dependencies:
```bash
pip install -r requirements.txt
```

4. Initialize the database and run Alembic migrations:
```bash
# Option A: Run migration with Alembic
alembic upgrade head

# Option B: Run inspection & initialization script
python init_db.py
```

5. Start the FastAPI development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **API Root**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Health Check Endpoint**: `http://localhost:8000/api/health`
- **Database Ping Endpoint**: `http://localhost:8000/api/database/ping`
- **System Info Endpoint**: `http://localhost:8000/api/info`
- **Authentication Endpoints**:
  - `POST /api/auth/register` - Create new user account (returns 201 + JWT + HTTP-only cookie)
  - `POST /api/auth/login` - Authenticate with email and password (returns 200 + JWT + HTTP-only cookie)
  - `GET /api/auth/me` - Retrieve current authenticated user profile
  - `POST /api/auth/logout` - Clear session and revoke HTTP-only cookie
- **Farm Management Endpoints**:
  - `GET /api/farms` - List authenticated user's farms (with dynamic field counts)
  - `POST /api/farms` - Create new farm owned by user (validates unique name, >0 area)
  - `GET /api/farms/{id}` - Fetch farm details (strict user ownership verification)
  - `PUT /api/farms/{id}` - Update farm properties (name, location, area, unit)
  - `DELETE /api/farms/{id}` - Safely delete farm with cascading field plots
- **Field Management Endpoints**:
  - `GET /api/farms/{id}/fields` - List fields belonging to a specific farm
  - `POST /api/farms/{id}/fields` - Create new plot under farm (soil & irrigation metadata)
  - `GET /api/fields` - List all fields across all farms owned by the user
  - `GET /api/fields/{id}` - Fetch single field details with ownership verification
  - `PUT /api/fields/{id}` - Update field plot details
  - `DELETE /api/fields/{id}` - Delete field plot

6. Run the Automated Test Suites:
```bash
# Run Authentication Test Suite (10/10 tests)
python test_auth.py

# Run Farm & Field Management Test Suite (13/13 tests)
python test_farm_field.py
```

---

### 4. Frontend Setup (Next.js)

1. Open a terminal in the `frontend/` directory:
```bash
cd frontend
```

2. Install client dependencies:
```bash
npm install
```

3. Start the Next.js development server:
```bash
npm run dev
```
- Open `http://localhost:3000` in your web browser.
- **Login Route**: `http://localhost:3000/login`
- **Register Route**: `http://localhost:3000/register`
- **Farms Management**: `http://localhost:3000/farms`
- **Farm Details & Plots**: `http://localhost:3000/farms/[id]`
- **Global Fields View**: `http://localhost:3000/fields`
- **Labour Management**: `http://localhost:3000/labour`
- **Add Labour**: `http://localhost:3000/labour/new`
- **Labour Profile**: `http://localhost:3000/labour/[id]`

---

## 👥 Phase 7 — Labour Management Documentation

### Overview
Phase 7 introduces workforce tracking and daily wage agreements. Every worker belongs strictly to a farm estate owned by the authenticated user (`User -> 1:M Farm -> 1:M Labour`).

### Database Model (`labour`)
- `id` (UUID, primary key)
- `farm_id` (UUID, foreign key referencing `farms.id` with `CASCADE` on delete)
- `name` (String(120), required, validated non-empty)
- `phone` (String(30), optional, validated phone format)
- `address` (String(255), optional)
- `work_type` (String(60), default `General Labour`, examples: `Tractor Operator`, `Irrigation Worker`, `Harvest Worker`, `Field Worker`)
- `daily_wage` (Numeric(10, 2), required, constraint `daily_wage >= 0`)
- `joining_date` (Date, required)
- `status` (String(20), default `active`, constraint `status IN ('active', 'inactive')`)
- `notes` (Text, optional)
- `created_at`, `updated_at` (DateTime timezone-aware)

### REST API Endpoints
| Method | Endpoint | Description | Ownership Verification |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/labour` | List all workers across user's farms (filters: `status`, `farm_id`, `work_type`, `search`) | Enforced |
| `GET` | `/api/labour/stats` | Aggregate workforce summary (total, active, inactive) | Enforced |
| `POST` | `/api/labour` | Register new worker (requires `farm_id` in body) | Enforced |
| `GET` | `/api/labour/{id}` | Retrieve specific worker profile | Enforced |
| `PUT` | `/api/labour/{id}` | Update worker details, daily wage, or status | Enforced |
| `DELETE`| `/api/labour/{id}` | Deactivates worker (`active -> inactive`) to preserve history; `?permanent=true` permanently deletes | Enforced |
| `GET` | `/api/farms/{id}/labour` | List workers registered under a specific farm | Enforced |
| `POST` | `/api/farms/{id}/labour` | Register new worker on a specific farm | Enforced |

### Security & Data Isolation
- **Ownership Verification**: Backend validates that `farm.user_id == current_user.id` on every creation, retrieval, update, or deactivation request.
- **Cross-Tenant Blocking**: User B receives HTTP 404 if attempting to read or modify User A's worker records or post a worker to User A's farm.
- **Safe Deactivation**: Deleting a worker sets `status = "inactive"` by default to ensure historical attendance and payroll continuity in future phases.

### Running Labour Management Automated Tests
```bash
cd backend
venv\Scripts\python.exe test_labour.py
```

---

## ⏱️ Phase 8 — Attendance Management & Working Hours Documentation

### Overview
Phase 8 introduces digital muster roll attendance and exact working hours calculations. Attendance records strictly tie to agricultural workers owned by the authenticated user (`User -> 1:M Farm -> 1:M Labour -> 1:M Attendance`).

### Database Model (`attendance`)
- `id` (UUID, primary key)
- `labour_id` (UUID, foreign key referencing `labour.id` with `CASCADE` on delete, indexed)
- `attendance_date` (Date, indexed)
- `status` (String(20), default `present`, constraint `status IN ('present', 'absent', 'half_day', 'leave')`, indexed)
- `check_in` (Time, nullable clock time)
- `check_out` (Time, nullable clock time)
- `working_minutes` (Integer, default 0, constraint `working_minutes >= 0`)
- `overtime_minutes` (Integer, default 0, constraint `overtime_minutes >= 0`)
- `notes` (Text, optional remarks / tasks)
- `created_at`, `updated_at` (DateTime timezone-aware UTC)
- **Unique Constraint**: `uq_labour_attendance_date` on `(labour_id, attendance_date)` preventing duplicate records for the same worker on the same date.

### Attendance Statuses
1. **Present**: Worker attended full duty. Check-in and check-out calculate exact elapsed time (or default 8h/480m if unclocked).
2. **Absent**: Worker did not attend. Working minutes and approved overtime are authoritatively set to 0.
3. **Half Day**: Worker attended partial shift. Check-in/out determine elapsed time (or default 4h/240m if unclocked).
4. **Leave**: Worker on approved leave. Working minutes and overtime are set to 0.

### Working Hours & Shift Calculation Method
- **Standard Shifts (`check_out >= check_in`)**:
  $$\text{Working Duration} = \text{Check-out Minutes} - \text{Check-in Minutes}$$
  e.g., 09:00 AM → 05:30 PM = 510 minutes (8h 30m).
- **Overnight Shifts (`check_out < check_in`)**:
  $$\text{Working Duration} = (1440 - \text{Check-in Minutes}) + \text{Check-out Minutes}$$
  e.g., 09:00 PM → 05:00 AM next day = 480 minutes (8h).
- **Unpaid Breaks**: No break deduction is applied; backend calculates authoritative elapsed shift minutes.
- **Overtime Handling**:
  - Overtime is entered as approved integer minutes (must be $\ge 0$).
  - Overtime cannot exceed total elapsed working duration ($\text{overtime\_minutes} \le \text{working\_minutes}$).
  - For Absent and Leave, overtime is strictly 0.

### Timezone Strategy
- Timestamps (`created_at`, `updated_at`) are stored in PostgreSQL with UTC timezone awareness.
- Calendar dates (`attendance_date`) and clock times (`check_in`, `check_out`) correspond to local agricultural operations (Indian Standard Time, UTC+05:30) and are formatted as 12-hour AM/PM displays on the client interface.

### REST API Endpoints
| Method | Endpoint | Description | Ownership Verification |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/attendance` | List attendance logs (filters: `date`, `farm_id`, `labour_id`, `status`, `search`) | Enforced |
| `GET` | `/api/attendance/summary` | Daily breakdown (present, absent, half-day, leave, unmarked, total hours) | Enforced |
| `GET` | `/api/attendance/date/{date}` | Retrieve all attendance records for a specific date | Enforced |
| `GET` | `/api/attendance/{id}` | Retrieve single attendance record details | Enforced |
| `POST`| `/api/attendance` | Create attendance record (409 Conflict on duplicate date) | Enforced |
| `PUT` | `/api/attendance/{id}` | Update check-in/out times, status, or overtime; recalculates hours | Enforced |
| `DELETE`| `/api/attendance/{id}` | Permanently delete attendance record | Enforced |
| `POST`| `/api/attendance/bulk` | Fast bulk muster sheet; safely upserts records without collisions | Enforced |
| `GET` | `/api/labour/{id}/attendance`| Worker chronological attendance history | Enforced |
| `POST`| `/api/labour/{id}/attendance`| Record attendance for a specific worker via nested route | Enforced |

### Migration Instructions
Run the Alembic migration to create the `attendance` table:
```bash
cd backend
alembic upgrade head
```
*(Migration file: `backend/alembic/versions/0004_add_attendance_table.py`)*

### Running Automated Tests
```bash
cd backend
venv\Scripts\python.exe test_attendance.py
```

---

## 💼 Phase 9 — Salary Management & Labour Payments

Phase 9 establishes the authoritative financial wage calculation engine and disbursement ledger for agricultural workers across configured time periods.

### Key Capabilities & Architectural Safeguards
1. **Authoritative Backend Calculation**: The frontend never independently computes authoritative salary amounts; all breakdowns are computed by FastAPI using Python `Decimal` and PostgreSQL `Numeric(12, 2)` to eliminate floating-point rounding errors.
2. **Explicit Attendance Policy**:
   - **Present**: 1.0 payable attendance unit.
   - **Half Day**: 0.5 payable attendance unit.
   - **Absent**: 0.0 units (unpaid).
   - **Leave**: 0.0 units (unpaid default policy).
   - **Overtime**: Tracked separately in minutes; overtime pay is strictly decoupled and only added via explicit approved overtime compensation.
3. **Historical Wage Snapshot**: When a salary record is generated, `daily_wage_snapshot` freezes the worker's rate at calculation time. Subsequent updates to the worker's profile wage do not silently modify historical payroll records.
4. **Duplicate Record Prevention**: A database unique constraint (`uq_salary_labour_period`) and application-level verification strictly prevent generating duplicate salary records for the same worker and identical date interval.
5. **Partial & Full Payment Ledger**:
   - Disbursements can be made in installments (Cash, Bank Transfer, UPI, Cheque, Other).
   - Overpayment is strictly rejected on the backend (`amount <= outstanding_balance`).
   - Zero and negative payments are rejected.
   - Atomically updates `amount_paid`, `outstanding_balance`, and status (`generated` → `partially_paid` → `paid`) within a database transaction.
6. **Audit Trail Preservation**: Deleting a salary record with recorded payments is forbidden to maintain ledger audit integrity.
7. **Multi-Tenant Isolation**: Strict authorization ensures farm owners can only view, generate, or disburse payments for workers on their own farms (preventing cross-user IDOR access).

### Database Schema Changes
- **`salary_records` table**:
  - `id`: UUID (Primary Key)
  - `labour_id`: UUID (Foreign Key to `labour.id`, CASCADE)
  - `farm_id`: UUID (Foreign Key to `farms.id`, CASCADE)
  - `period_start`: Date
  - `period_end`: Date
  - `daily_wage_snapshot`: Numeric(10, 2)
  - `present_days`: Numeric(5, 2)
  - `half_days`: Integer
  - `absent_days`: Integer
  - `leave_days`: Integer
  - `payable_units`: Numeric(5, 2)
  - `regular_salary`: Numeric(12, 2)
  - `overtime_pay`: Numeric(12, 2)
  - `additional_earnings`: Numeric(12, 2)
  - `deductions`: Numeric(12, 2)
  - `gross_salary`: Numeric(12, 2)
  - `net_salary`: Numeric(12, 2)
  - `amount_paid`: Numeric(12, 2)
  - `outstanding_balance`: Numeric(12, 2)
  - `status`: String(20) (`draft`, `generated`, `partially_paid`, `paid`)
  - `notes`: Text (Optional)
  - `calculation_metadata`: Text (JSON string)
  - `created_at`, `updated_at`: Timestamps
- **`salary_payments` table**:
  - `id`: UUID (Primary Key)
  - `salary_record_id`: UUID (Foreign Key to `salary_records.id`, CASCADE)
  - `amount`: Numeric(12, 2) (Check constraint: `amount > 0`)
  - `payment_date`: Date
  - `payment_method`: String(30) (`cash`, `bank_transfer`, `upi`, `cheque`, `other`)
  - `transaction_reference`: String(100) (Optional)
  - `notes`: Text (Optional)
  - `created_at`, `updated_at`: Timestamps

### API Endpoints

| Method | Endpoint | Description | Tenant Isolation |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/salaries` | List salary records with multi-criteria filtering | Enforced |
| `GET` | `/api/salaries/summary` | Aggregate salary totals, disbursements, and balances | Enforced |
| `POST`| `/api/salaries/preview` | Authoritative preview breakdown without persisting | Enforced |
| `POST`| `/api/salaries` | Generate and freeze official salary ledger record | Enforced |
| `GET` | `/api/salaries/{id}` | Detailed salary breakdown by UUID | Enforced |
| `PUT` | `/api/salaries/{id}` | Update adjustments/notes on existing salary | Enforced |
| `DELETE`| `/api/salaries/{id}` | Delete unpaid salary record (zero payments only) | Enforced |
| `GET` | `/api/salaries/{id}/payments` | List payment disbursement history for salary | Enforced |
| `POST`| `/api/salaries/{id}/payments` | Record payment disbursement against balance | Enforced |
| `GET` | `/api/salaries/{id}/payments/{pid}` | Get specific payment disbursement item | Enforced |
| `GET` | `/api/labour/{id}/salaries` | Worker chronological salary history | Enforced |

### Migration Instructions
Run the Alembic migration to create `salary_records` and `salary_payments` tables:
```bash
cd backend
alembic upgrade head
```
*(Migration file: `backend/alembic/versions/0005_add_salary_and_payment_tables.py`)*

### Running Automated Tests
```bash
cd backend
venv\Scripts\python.exe test_salary.py
```

---

## 🌿 Phase 10 — Fertilizer & Pesticide Management

Phase 10 implements the agricultural input tracking module enabling farm owners to log, calculate, and audit all nutrient applications and crop protection sprays across their estates, fields, and crops.

### Key Capabilities & Business Logic
1. **Unified Application Architecture**:
   - Single unified relational model `AgriculturalApplication` (`agricultural_applications`) supporting both `fertilizer` and `pesticide` categories.
   - Eliminates duplicate database tables while providing tailored interfaces for nutrient management (`/fertilizer`) and crop protection (`/pesticides`).
2. **Authoritative Cost Calculations**:
   - **Cost Computation**: When quantity and unit price are recorded:
     $$\text{Total Cost} = (\text{Quantity} \times \text{Unit Cost})$$
   - Uses Python `Decimal` and PostgreSQL `Numeric(10, 2)` and `Numeric(12, 2)` for precision without binary floating-point errors.
   - Distinguishes unknown purchase prices (where cost remains `null`) from confirmed zero-cost inputs (e.g. on-farm organic compost).
   - Allows explicit lump-sum total cost when individual unit prices are not known.
3. **Relational Hierarchy & Ownership**:
   - Strict multi-tenant verification: Target `Farm` must belong to the authenticated user.
   - Target `Field` plot must belong to the specified farm.
   - Target `Crop` (optional) must be actively cultivated on the specified field plot.
4. **Validation Rules**:
   - Quantity must be strictly positive (`quantity > 0`).
   - Unit cost and total cost cannot be negative (`cost >= 0`).
   - Units stored alongside quantities (e.g. `kg`, `g`, `L`, `ml`, `bags`).
   - Category restricted to `'fertilizer'` and `'pesticide'`.
5. **Expenditure Summaries**:
   - Aggregate calculation of total applications, fertilizer applications count, pesticide applications count, total fertilizer expenditure, total pesticide expenditure, and combined input costs.

### Database Schema Changes
- **`agricultural_applications` table**:
  - `id`: UUID (Primary Key)
  - `farm_id`: UUID (Foreign Key to `farms.id`, CASCADE, Indexed)
  - `field_id`: UUID (Foreign Key to `fields.id`, CASCADE, Indexed)
  - `crop_id`: UUID (Foreign Key to `crops.id`, SET NULL, Indexed, Optional)
  - `application_category`: String(30) (`fertilizer` or `pesticide`, Indexed)
  - `product_name`: String(150) (Indexed)
  - `product_type`: String(60) (Indexed)
  - `quantity`: Numeric(10, 2) (Check constraint: `quantity > 0`)
  - `unit`: String(30)
  - `unit_cost`: Numeric(10, 2) (Check constraint: `unit_cost IS NULL OR unit_cost >= 0`)
  - `total_cost`: Numeric(12, 2) (Check constraint: `total_cost IS NULL OR total_cost >= 0`)
  - `application_date`: Date (Indexed)
  - `application_method`: String(60) (Optional)
  - `purpose`: String(255) (Optional, target pest, disease, or nutrient deficiency)
  - `notes`: Text (Optional)
  - `created_at`, `updated_at`: Timestamps

### API Endpoints

| Method | Endpoint | Description | Tenant Isolation |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/applications` | List applications with multi-criteria filtering | Enforced |
| `GET` | `/api/applications/summary` | Aggregate application counts and total expenditures | Enforced |
| `POST`| `/api/applications` | Record new fertilizer or pesticide application | Enforced |
| `GET` | `/api/applications/{id}` | Detailed application record by UUID | Enforced |
| `PUT` | `/api/applications/{id}` | Update application details with cost recalculation | Enforced |
| `DELETE`| `/api/applications/{id}` | Safely remove application record | Enforced |
| `GET` | `/api/applications/farm/{id}` | List applications for a specific farm | Enforced |
| `GET` | `/api/applications/field/{id}` | List applications for a specific field plot | Enforced |
| `GET` | `/api/applications/crop/{id}` | List applications for a specific crop cycle | Enforced |

### Migration Instructions
Run the Alembic migration to create `agricultural_applications` table:
```bash
cd backend
alembic upgrade head
```
*(Migration file: `backend/alembic/versions/0006_add_agricultural_applications_table.py`)*

### Running Automated Tests
```bash
cd backend
venv\Scripts\python.exe test_application.py
```

---

## 💰 Phase 12: Expense Management (Completed)

AgriCore includes an enterprise-grade, multi-tenant **Expense Management and Financial Disbursement Module** designed to record, categorize, allocate, and analyze farm operating expenditures.

### Key Architectural Features
1. **13 Standardized Expense Categories**:
   - `Labour`, `Fertilizer`, `Pesticide`, `Seeds`, `Irrigation`, `Fuel`, `Equipment`, `Maintenance and Repairs`, `Transportation`, `Electricity`, `Water`, `Rent and Leasing`, `Other` (with custom description/notes).
2. **Authoritative Financial Calculation Engine**:
   - Monetary values stored as PostgreSQL `Numeric(12, 2)` and computed using Python `Decimal` to eliminate binary floating-point inaccuracies.
   - Displayed throughout in Indian Rupees (`₹`).
   - Dynamic balance calculation:
     $$\text{Outstanding Balance} = \text{Total Amount} - \text{Amount Paid}$$
   - Dynamic payment status workflow derived from real recorded disbursement payments:
     - `unpaid`: $\text{Amount Paid} = 0$
     - `partially_paid`: $0 < \text{Amount Paid} < \text{Total Amount}$
     - `paid`: $\text{Amount Paid} = \text{Total Amount}$
   - Strict overpayment prevention: individual payments or total disbursements cannot exceed the expense total.
3. **Double-Entry Disbursement Ledger**:
   - Separate `expense_payments` model captures installment records with payment method (`cash`, `upi`, `bank_transfer`, `cheque`, `credit_card`, `other`), transaction reference, payment date, and audit notes.
4. **Relational Hierarchy & Allocation**:
   - **Farm** (Mandatory): Strict multi-tenant verification ensuring the target farm belongs to the authenticated user.
   - **Field Plot** (Optional): Validates that the selected field belongs to the selected farm.
   - **Crop Cycle** (Optional): Validates that the selected crop cycle belongs to the target farm or field.
5. **Financial Audit Trail & Safe Deletion**:
   - Expenses with recorded payments cannot be arbitrarily deleted (`400 Bad Request`), preventing financial tampering and accounting discrepancies.
   - Unpaid expenses can be safely removed by the authorized farm owner.
6. **Multi-Criteria Filtering & Export**:
   - Filter by farm, field, crop, category, payment status, vendor name, search keyword, and date range.
   - Instant CSV export of filtered records for accounting or offline auditing.

### Database Schema Changes
- **`expenses` table**:
  - `id`: UUID (Primary Key)
  - `farm_id`: UUID (Foreign Key to `farms.id`, CASCADE, Indexed)
  - `field_id`: UUID (Foreign Key to `fields.id`, SET NULL, Indexed, Optional)
  - `crop_id`: UUID (Foreign Key to `crops.id`, SET NULL, Indexed, Optional)
  - `category`: String(50) (Indexed, validated against 13 allowed categories)
  - `title`: String(200) (Indexed)
  - `description`: Text (Optional)
  - `amount`: Numeric(12, 2) (Check constraint: `amount > 0`)
  - `amount_paid`: Numeric(12, 2) (Check constraint: `amount_paid >= 0`)
  - `outstanding_balance`: Numeric(12, 2) (Check constraint: `outstanding_balance >= 0`)
  - `expense_date`: Date (Indexed)
  - `payment_status`: String(20) (Indexed: `unpaid`, `partially_paid`, `paid`)
  - `payment_method`: String(30) (Optional)
  - `vendor_name`: String(150) (Indexed, Optional)
  - `invoice_number`: String(100) (Indexed, Optional)
  - `transaction_reference`: String(100) (Optional)
  - `notes`: Text (Optional)
  - `created_by`: UUID (Foreign Key to `users.id`, SET NULL)
  - `created_at`, `updated_at`: Timestamps
- **`expense_payments` table**:
  - `id`: UUID (Primary Key)
  - `expense_id`: UUID (Foreign Key to `expenses.id`, CASCADE, Indexed)
  - `amount`: Numeric(12, 2) (Check constraint: `amount > 0`)
  - `payment_date`: Date (Indexed)
  - `payment_method`: String(30) (Validated)
  - `transaction_reference`: String(100) (Optional)
  - `notes`: Text (Optional)
  - `created_by`: UUID (Foreign Key to `users.id`, SET NULL)
  - `created_at`, `updated_at`: Timestamps

### API Endpoints

| Method | Endpoint | Description | Tenant Isolation |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/expenses` | List expenses with multi-criteria filtering | Enforced |
| `GET` | `/api/expenses/summary` | Aggregate metrics, counts, and category breakdown | Enforced |
| `POST`| `/api/expenses` | Record new farm expense (auto records payment if paid) | Enforced |
| `GET` | `/api/expenses/export` | Export filtered expenses as downloadable CSV | Enforced |
| `GET` | `/api/expenses/{id}` | Detailed expense record with payment ledger | Enforced |
| `PUT` | `/api/expenses/{id}` | Update expense details and recalculate balances | Enforced |
| `DELETE`| `/api/expenses/{id}` | Safely delete unpaid expense (audit protected) | Enforced |
| `GET` | `/api/expenses/{id}/payments` | List payment transactions for an expense | Enforced |
| `POST`| `/api/expenses/{id}/payments` | Record installment or full disbursement payment | Enforced |
| `GET` | `/api/expenses/farm/{id}` | Convenience route for farm expenses | Enforced |
| `GET` | `/api/expenses/field/{id}` | Convenience route for field plot expenses | Enforced |
| `GET` | `/api/expenses/crop/{id}` | Convenience route for crop cycle expenses | Enforced |

### Migration Instructions
Run the Alembic migration to create `expenses` and `expense_payments` tables:
```bash
cd backend
alembic upgrade head
```
*(Migration file: `backend/alembic/versions/0007_add_expenses_and_payments_tables.py`)*

### Running Automated Tests
```bash
cd backend
venv\Scripts\python.exe test_expense.py
```

---

## 🚜 Phase 13: Equipment & Machinery Management (Completed)

AgriCore includes an enterprise-grade, multi-tenant **Equipment, Machinery, and Implement Management Module** allowing farm owners to catalog assets, monitor operating statuses, schedule preventive maintenance, record breakdown repairs, and audit total fleet ownership and servicing expenditures.

### Key Architectural Features & Safeguards
1. **Relational Fleet & Station Hierarchy**:
   - **Farm Estate** (Mandatory): Strict multi-tenant verification ensuring every equipment item belongs to a farm owned by the authenticated user (`User -> 1:M Farm -> 1:M Equipment`).
   - **Field Plot** (Optional): Validates that assigned field plots belong to the selected farm estate.
2. **Predefined & Custom Equipment Classification**:
   - Standard equipment categories: `Tractor`, `Cultivator`, `Plough`, `Harvester`, `Seed Drill`, `Sprayer`, `Water Pump`, `Drip Irrigation Equipment`, `Sprinkler System`, `Power Tiller`, `Trailer`, and `Other` (with custom category support).
3. **Operational Health & Physical Condition Lifecycle**:
   - **Physical Condition**: `excellent` (like new), `good` (fully operational), `fair` (normal wear), `poor` (needs attention), `damaged` (inoperable).
   - **Operational Status**: `available` (ready in yard), `in_use` (active in field), `under_maintenance` (undergoing service/repairs), `retired` (decommissioned).
4. **Maintenance, Repair, and Servicing Ledger**:
   - Relational `equipment_maintenance` model tracks service date, maintenance type (`routine_service`, `preventive_maintenance`, `repair`, `inspection`, `parts_replacement`, `other`), service description, mechanic/workshop, replaced parts, monetary cost, downtime in minutes, and recommended next service date.
   - **Automatic Service Date Synchronization**: Creating or updating a maintenance record automatically updates the machinery's `last_service_date` to the latest service date and synchronizes `next_service_date`.
5. **Proactive Service Schedules & Countdown Alerts**:
   - Authoritative backend calculation dynamically derives service status:
     - `overdue`: $\text{Next Service Date} < \text{Today}$
     - `due_soon`: $\text{Next Service Date} \le \text{Today} + 7\text{ days}$
     - `upcoming`: $\text{Next Service Date} \le \text{Today} + 30\text{ days}$
     - `ok`: Scheduled beyond 30 days
     - `retired`: Decommissioned assets excluded from alerts
     - `not_scheduled`: Assets with missing next service dates
6. **Authoritative Financial Calculations & Decimal Precision**:
   - Monetary values stored as PostgreSQL `Numeric(12, 2)` and computed using Python `Decimal` to eliminate binary floating-point rounding errors.
   - Rejects negative purchase prices and maintenance costs.
   - Distinguishes unknown purchase prices (`null`) from confirmed zero-cost items (`0.00`).
   - Fleet asset value computes:
     $$\text{Total Fleet Asset Value} = \sum (\text{Purchase Price} \times \text{Quantity})$$
   - Total servicing expenditure computes:
     $$\text{Total Maintenance Cost} = \sum (\text{Service Record Cost})$$
7. **Safe Deletion & Historical Audit Preservation**:
   - Permanent deletion of equipment with recorded maintenance history is blocked (`400 Bad Request`) to preserve financial and maintenance audit trails.
   - Setting status to `retired` is the recommended workflow to archive decommissioned assets without data loss.
   - Permanent override (`?force=true`) or unserviced machinery deletion is available for authorized farm owners.
8. **Multi-Tenant IDOR Security Isolation**:
   - Strict tenant isolation blocks cross-user access. User B cannot view, edit, service, or delete User A's machinery or maintenance logs (`404 Not Found`).

### Database Schema Changes
- **`equipment` table**:
  - `id`: UUID (Primary Key, Indexed)
  - `farm_id`: UUID (Foreign Key to `farms.id`, CASCADE, Indexed)
  - `field_id`: UUID (Foreign Key to `fields.id`, SET NULL, Indexed, Optional)
  - `equipment_name`: String(150) (Indexed)
  - `equipment_type`: String(60) (Indexed)
  - `brand`: String(100) (Optional)
  - `model_number`: String(100) (Optional)
  - `serial_number`: String(100) (Indexed, Optional)
  - `purchase_date`: Date (Optional)
  - `purchase_price`: Numeric(12, 2) (Check constraint: `purchase_price IS NULL OR purchase_price >= 0`)
  - `supplier_name`: String(150) (Optional)
  - `quantity`: Integer (Default 1, Check constraint: `quantity > 0`)
  - `condition`: String(30) (Indexed: `excellent`, `good`, `fair`, `poor`, `damaged`)
  - `operational_status`: String(30) (Indexed: `available`, `in_use`, `under_maintenance`, `retired`)
  - `fuel_type`: String(50) (Optional)
  - `identification_number`: String(100) (Optional)
  - `warranty_expiry_date`: Date (Optional)
  - `last_service_date`: Date (Optional)
  - `next_service_date`: Date (Indexed, Optional)
  - `notes`: Text (Optional)
  - `created_at`, `updated_at`: Timestamps
- **`equipment_maintenance` table**:
  - `id`: UUID (Primary Key, Indexed)
  - `equipment_id`: UUID (Foreign Key to `equipment.id`, CASCADE, Indexed)
  - `maintenance_type`: String(50) (Indexed: `routine_service`, `preventive_maintenance`, `repair`, `inspection`, `parts_replacement`, `other`)
  - `service_date`: Date (Indexed)
  - `description`: Text (Required)
  - `service_provider`: String(150) (Optional)
  - `parts_replaced`: Text (Optional)
  - `cost`: Numeric(12, 2) (Check constraint: `cost IS NULL OR cost >= 0`)
  - `downtime_minutes`: Integer (Check constraint: `downtime_minutes IS NULL OR downtime_minutes >= 0`)
  - `next_service_date`: Date (Optional)
  - `notes`: Text (Optional)
  - `created_at`, `updated_at`: Timestamps

### API Endpoints

| Method | Endpoint | Description | Tenant Isolation |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/equipment` | List equipment with multi-criteria filtering | Enforced |
| `GET` | `/api/equipment/summary` | Aggregate fleet counts, service alerts, and total expenditures | Enforced |
| `POST`| `/api/equipment` | Register new equipment or machinery | Enforced |
| `GET` | `/api/equipment/{id}` | Detailed equipment profile with maintenance history | Enforced |
| `PUT` | `/api/equipment/{id}` | Update equipment specifications and schedules | Enforced |
| `PATCH`| `/api/equipment/{id}/status` | Quickly transition operational status and condition | Enforced |
| `DELETE`| `/api/equipment/{id}` | Safely delete equipment (audit history protected) | Enforced |
| `GET` | `/api/equipment/{id}/maintenance` | List maintenance and repair history | Enforced |
| `POST`| `/api/equipment/{id}/maintenance` | Log new maintenance event and auto-sync service dates | Enforced |
| `GET` | `/api/equipment/{id}/maintenance/{mid}` | Retrieve specific maintenance record details | Enforced |
| `PUT` | `/api/equipment/{id}/maintenance/{mid}` | Update maintenance record and recalculate service dates | Enforced |
| `DELETE`| `/api/equipment/{id}/maintenance/{mid}` | Delete maintenance record and recalculate last service date | Enforced |
| `GET` | `/api/farms/{id}/equipment` | Convenience route for farm machinery | Enforced |
| `GET` | `/api/fields/{id}/equipment` | Convenience route for field plot equipment | Enforced |

### Migration Instructions
Run the Alembic migration to create `equipment` and `equipment_maintenance` tables:
```bash
cd backend
alembic upgrade head
```
*(Migration file: `backend/alembic/versions/0008_add_equipment_and_maintenance_tables.py`)*

### Running Automated Tests
```bash
cd backend
venv\Scripts\python.exe test_equipment.py
```

---

## 🌾 Phase 14: Harvest Management

### Overview
Phase 14 implements an end-to-end **Harvest Management module** enabling authorized farm owners to record, monitor, update, and analyze crop produce yields across cultivated plots.

### Key Architectural Features & Business Rules
1. **Multi-Tenant Hierarchy Enforcement**:
   - Every harvest entry strictly validates that `Crop` belongs to `Field`, and `Field` belongs to `Farm`, and `Farm` is owned by the authenticated `User`.
   - Cross-farm and mismatched hierarchy attempts are blocked with `400 Bad Request`.
2. **Measurement Unit Integrity**:
   - Supports weight-based metric units (`kg`, `quintals`, `tonnes`, `grams`) and discrete packaging units (`bags`, `crates`, `pieces`, `other`).
   - Strict unit separation: Incompatible units are never added together blindly (e.g., kilograms and bags are kept strictly separate).
   - Authoritative conversion factor to metric kilograms:
     - 1 quintal = 100 kg
     - 1 tonne = 1,000 kg
     - 1 gram = 0.001 kg
     - 1 kg = 1 kg
3. **Automatic Crop Cycle Synchronization**:
   - When a harvest log is created, the system automatically checks and updates the crop's `actual_harvest_date` to the latest harvest date.
4. **Authoritative Yield Summaries**:
   - Aggregates total harvests count.
   - Calculates total metric produce weight in kilograms and tonnes.
   - Distinctly groups non-metric container units (`by_unit`).
   - Breaks down output crop-wise and field-wise.
5. **Quality Grading & Traceability**:
   - Supports quality classification (`Grade A`, `Grade B`, `Grade C`, `Standard`, `Rejected`, `Not specified`).
   - Tracks harvest method (`Manual`, `Machine`, `Combined`, `Other`), storage location, and batch/lot numbers for inventory readiness.
6. **Safe Deletion & Anti-Orphan Guards**:
   - Harvest deletion is isolated and never cascades to delete or modify parent crops, fields, or farm records.
7. **Multi-Tenant IDOR Security**:
   - Insecure direct object reference (IDOR) attacks are strictly blocked (`403 Forbidden`). Tenant B cannot view, modify, or delete Tenant A's harvest records.

### Database Schema Changes
- **`harvests` table**:
  - `id`: UUID (Primary Key, Indexed)
  - `farm_id`: UUID (Foreign Key to `farms.id`, CASCADE, Indexed)
  - `field_id`: UUID (Foreign Key to `fields.id`, CASCADE, Indexed)
  - `crop_id`: UUID (Foreign Key to `crops.id`, CASCADE, Indexed)
  - `harvest_date`: Date (Indexed)
  - `quantity`: Numeric(12, 2) (Check constraint: `quantity > 0`)
  - `unit`: String(30) (Default "kg")
  - `quality_grade`: String(30) (Default "Standard")
  - `harvest_method`: String(60) (Optional)
  - `storage_location`: String(150) (Optional)
  - `batch_number`: String(100) (Optional)
  - `notes`: Text (Optional)
  - `created_at`, `updated_at`: Timestamps
  - Compound indexes on `(farm_id, harvest_date)`, `(field_id, harvest_date)`, and `(crop_id, harvest_date)`

### API Endpoints

| Method | Endpoint | Description | Tenant Isolation |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/harvests` | List harvests with multi-attribute filtering & search | Enforced |
| `GET` | `/api/harvests/summary` | Yield aggregations, metric rollups, and unit distributions | Enforced |
| `POST`| `/api/harvests` | Record new crop harvest yield with hierarchy validation | Enforced |
| `GET` | `/api/harvests/{id}` | Detailed harvest record with populated entity names | Enforced |
| `PUT` | `/api/harvests/{id}` | Update harvest details, revalidate hierarchy | Enforced |
| `DELETE`| `/api/harvests/{id}` | Safely delete harvest record without damaging parent entities | Enforced |
| `GET` | `/api/farms/{id}/harvests` | Convenience route for farm harvests | Enforced |
| `GET` | `/api/fields/{id}/harvests` | Convenience route for field plot harvests | Enforced |
| `GET` | `/api/crops/{id}/harvests` | Convenience route for crop cycle harvests | Enforced |

### Migration Instructions
Run the Alembic migration to create the `harvests` table:
```bash
cd backend
venv\Scripts\python.exe -m alembic upgrade head
```
*(Migration file: `backend/alembic/versions/0009_add_harvests_table.py`)*

### Running Automated Tests
```bash
cd backend
venv\Scripts\python.exe test_harvest.py
```

---

## 💰 Phase 15: Sales, Income & Profit/Loss Management

### Overview
Phase 15 delivers a complete financial management engine tracking crop produce sales, invoice installments, auxiliary income streams (subsidies, equipment rentals, scrap, livestock), and unified real-time Net Profit/Loss calculations against operational expenses.

### Key Architectural Features & Business Rules
1. **Multi-Tenant Relational Integrity**:
   - Produce sales validate that `Farm` is owned by the authenticated `User`, and associated `Crop` or `Harvest` belongs to the selected farm estate.
2. **Authoritative Financial Math**:
   - `total_price = (quantity * unit_price) - discount_amount + tax_amount`.
   - `balance_due = total_price - paid_amount`.
   - Auto-computed payment statuses: `unpaid` (0 paid), `partially_paid` (0 < paid < total), `paid` (paid >= total).
3. **Audited Installment Ledgers**:
   - Sale payments are logged as distinct transactional records with receipt numbers, payment methods, notes, and timestamps.
   - Deleting or updating payments recalculates the master sale balance and status automatically.
4. **Safe Deletion & Anti-Orphan Protections**:
   - Produce sales with recorded payment history cannot be deleted without clearing the audit trail, preventing financial discrepancies.
5. **Unified Net Profit/Loss**:
   $$\text{Total Revenue} = \sum (\text{Produce Sales Revenue}) + \sum (\text{Other Farm Income})$$
   $$\text{Total Expenses} = \sum (\text{Phase 12 Operational Expenses})$$
   $$\text{Net Profit / Loss} = \text{Total Revenue} - \text{Total Expenses}$$

### Database Schema Changes
- **`sales` table**: Primary key `id` (UUID), `farm_id`, `crop_id`, `harvest_id`, `sale_number`, `sale_date`, `buyer_name`, `buyer_contact`, `quantity`, `unit`, `unit_price`, `total_price`, `discount_amount`, `tax_amount`, `paid_amount`, `balance_due`, `payment_status`, `payment_method`, `delivery_status`, `invoice_number`, `notes`.
- **`sale_payments` table**: `id`, `sale_id`, `payment_date`, `amount`, `payment_method`, `transaction_reference`, `notes`.
- **`other_income` table**: `id`, `farm_id`, `crop_id`, `income_date`, `category`, `source_or_payer`, `amount`, `payment_method`, `reference_number`, `notes`.

### Running Automated Tests
```bash
cd backend
venv\Scripts\python.exe test_sales_finance.py
```

---

## 📅 Phase 16: Farm Calendar Management

### Overview
Phase 16 implements an interactive agricultural scheduling and operations calendar enabling farm managers to schedule, monitor, and coordinate farm tasks, crop inspections, spray intervals, irrigation cycles, and labour assignments by date.

### Key Architectural Features & Business Rules
1. **15 Standardized Agricultural Activity Types**:
   - `general_task`: General Farm Task
   - `land_preparation`: Land Preparation & Tilling
   - `sowing`: Sowing & Seeding
   - `transplanting`: Seedling Transplanting
   - `fertilizer_application`: Fertilizer Application
   - `pesticide_application`: Pesticide Application
   - `irrigation`: Irrigation Run
   - `weeding`: Weeding & Herbicide
   - `pruning`: Pruning & Trellising
   - `crop_inspection`: Crop Health Inspection
   - `labour_assignment`: Labour Duty Assignment
   - `harvesting`: Harvesting Schedule
   - `equipment_maintenance`: Equipment Maintenance
   - `sales_appointment`: Sales or Delivery Appointment
   - `other`: Other Farm Event
2. **Strict Operational Decoupling**:
   - Creating a calendar event does NOT duplicate operational records (fertilizer applications, harvests, sales, or labour records). Operational modules remain the authoritative source of truth, linked optionally via relational references.
3. **Multi-Tenant Ownership & Hierarchy Validation**:
   - `farm_id` is required and verified against the authenticated user.
   - `field_id`, `crop_id`, and `assigned_labour_id` are strictly verified to belong to the selected farm and tenant.
4. **Interval Overlap Querying & Multi-Day Support**:
   - Single-day, all-day, and multi-day activities overlapping any requested range $[T_{\text{start}}, T_{\text{end}}]$ are accurately retrieved using mathematical interval overlap:
     $$\text{event.start\_datetime} \le T_{\text{end}} \quad \text{AND} \quad \text{COALESCE}(\text{event.end\_datetime}, \text{event.start\_datetime}) \ge T_{\text{start}}$$
5. **Timezone-Safe All-Day Scheduling**:
   - All-day events store `all_day=true`. Frontend calendar views use date string matching (`YYYY-MM-DD`) without UTC timezone day shifts.
6. **Status Lifecycle & Automatic Timestamp Tracking**:
   - Transitions between `planned`, `in_progress`, `completed`, and `cancelled`.
   - Transitioning to `completed` automatically records `actual_completion_datetime`. Reopening an activity preserves or resets the timestamp based on explicit payload.
7. **Safe Activity Deletion**:
   - Deleting a calendar activity is clean and safe; underlying farm assets, fields, crops, and worker accounts are never modified or deleted.

### Database Schema Changes
- **`farm_calendar_events` table**:
  - `id`: UUID (Primary Key, Indexed)
  - `farm_id`: UUID (Foreign Key to `farms.id`, CASCADE, Indexed, Required)
  - `field_id`: UUID (Foreign Key to `fields.id`, SET NULL, Indexed, Optional)
  - `crop_id`: UUID (Foreign Key to `crops.id`, SET NULL, Indexed, Optional)
  - `assigned_labour_id`: UUID (Foreign Key to `labour.id`, SET NULL, Indexed, Optional)
  - `created_by`: UUID (Foreign Key to `users.id`, SET NULL, Optional)
  - `title`: String(200) (Required, Indexed)
  - `description`: Text (Optional)
  - `activity_type`: String(60) (Indexed, 15 activity types)
  - `start_datetime`: DateTime with Timezone (Required, Indexed)
  - `end_datetime`: DateTime with Timezone (Optional, Indexed)
  - `all_day`: Boolean (Default false, Indexed)
  - `status`: String(30) (Default `planned`, Indexed: `planned`, `in_progress`, `completed`, `cancelled`)
  - `priority`: String(20) (Default `medium`, Indexed: `low`, `medium`, `high`)
  - `related_module`: String(50) (Optional)
  - `related_record_id`: UUID (Optional)
  - `actual_completion_datetime`: DateTime with Timezone (Optional)
  - `notes`: Text (Optional)
  - `created_at`, `updated_at`: Timestamps
  - Compound indexes on `(farm_id, start_datetime)` and `(activity_type, status)`

### API Endpoints

| Method | Endpoint | Description | Tenant Isolation |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/calendar/events` | List activities with date range overlap, hierarchy, type, and status filters | Enforced |
| `GET` | `/api/calendar/summary` | KPI counts (total, planned, in-progress, completed, overdue) & activity breakdown | Enforced |
| `POST`| `/api/calendar/events` | Schedule new farm activity with hierarchy validation | Enforced |
| `GET` | `/api/calendar/events/{id}` | Detailed event view with populated farm, field, crop, and labour names | Enforced |
| `PUT` | `/api/calendar/events/{id}` | Update event parameters, dates, and resource assignments | Enforced |
| `PATCH`| `/api/calendar/events/{id}/status` | Fast status transition with auto-completion timestamp tracking | Enforced |
| `DELETE`| `/api/calendar/events/{id}` | Safely remove calendar activity without touching farm records | Enforced |
| `GET` | `/api/farms/{id}/calendar/events` | Convenience route for farm activities | Enforced |
| `GET` | `/api/crops/{id}/calendar/events` | Convenience route for crop cycle activities | Enforced |

### Migration Instructions
Run the Alembic migration to create the `farm_calendar_events` table:
```bash
cd backend
venv\Scripts\python.exe -m alembic upgrade head
```
*(Migration file: `backend/alembic/versions/0011_add_farm_calendar_events_table.py`)*

### Running Automated Tests
```bash
cd backend
venv\Scripts\python.exe test_calendar.py
```

---

## 📊 Phase 17: Dashboard Analytics + Recharts

The Farm Operations Dashboard delivers an enterprise-grade, real-time command center providing farm owners with comprehensive agronomic, workforce, and financial intelligence. All metrics, KPI cards, and Recharts charts are powered by authoritative, read-only SQL aggregations against PostgreSQL/SQLite—strictly eliminating mock data or fabricated numbers.

### Key Architectural Features & Business Rules
1. **Consolidated Master Analytics & Modular Sub-Endpoints**:
   - `GET /api/dashboard/analytics`: Returns the complete consolidated dashboard state in a single, high-performance HTTP query.
   - 8 modular sub-endpoints allow decoupled or granular widget loading (`/summary`, `/financial-overview`, `/income-expense-trend`, `/expense-breakdown`, `/attendance-trend`, `/crop-distribution`, `/harvest-trend`, `/upcoming-activities`).
2. **Authoritative Financial Calculation Engine**:
   - $\text{Total Sales Revenue} = \sum (\text{Sale.gross\_amount} - \text{Sale.discount\_amount})$
   - $\text{Total Other Income} = \sum (\text{OtherIncome.amount})$
   - $\text{Total Income} = \text{Total Sales Revenue} + \text{Total Other Income}$
   - $\text{Total Expenses} = \sum (\text{Expense.amount})$
   - $\text{Recorded Profit/Loss} = \text{Total Income} - \text{Total Expenses}$
   - $\text{Profit Margin \%} = \left(\frac{\text{Recorded Profit/Loss}}{\text{Total Income}}\right) \times 100 \quad (\text{when Total Income} > 0)$
   - $\text{Outstanding Receivables} = \sum (\text{Sale.outstanding\_amount})$
   - $\text{Outstanding Payables} = \sum (\text{Expense.outstanding\_balance})$
   - Computations use `Decimal`-safe arithmetic, preventing floating-point drift and avoiding duplicate transaction counting.
3. **Multi-Tenant Ownership & Farm Scope Filtering**:
   - Farm estate scope filter enables viewing consolidated multi-farm data or drilling down into a specific estate.
   - Farm ownership is validated against the authenticated user (`current_user.id`). Unauthorized farm IDs return HTTP 404 (IDOR prevention).
4. **Flexible Reporting Period & Date Range Filtering**:
   - Date range presets: `All Time`, `Today`, `Last 7 Days`, `Last 30 Days`, `This Month`, `Previous Month`, `This Year`, and `Custom Date Range`.
   - Backend strictly validates that `start_date <= end_date` (rejecting invalid ranges with HTTP 400).
5. **Interactive Recharts Visualizations**:
   - **Chart 1: Income vs Expenses Chart** (`IncomeExpenseChart`): Periodic BarChart comparing gross farm receipts vs operating expenditures with custom INR tooltips and legends.
   - **Chart 2: Expense Category Breakdown** (`ExpenseCategoryChart`): Donut/Pie chart categorizing operating expenses across seeds, fertilizer, pesticides, labour, machinery, irrigation, fuel, and maintenance.
   - **Chart 3: Attendance Trend** (`AttendanceTrendChart`): Stacked BarChart visualizing daily muster roll coverage (Present, Half-Day, Absent) and total logged work hours.
   - **Chart 4: Crop Variety & Acreage Distribution** (`CropDistributionChart`): Donut chart showing acreage allocation across cultivated crop varieties and field plots.
   - **Chart 5: Harvest Output & Yield Trend** (`HarvestTrendChart`): BarChart tracking harvested crop yields and quantities over time with proper units.
   - **Chart 6: Financial Performance Trajectory** (`FinancialPerformanceChart`): ComposedChart tracking income, expenses, and net profit/loss trajectories over time with linear gradient area fills.
6. **Upcoming Farm Activities Feed**:
   - Displays imminent operations from Phase 16 Farm Calendar with date/time, estate/plot, status pill, and priority badge, linked directly to `/calendar`.
7. **Read-Only Aggregation**:
   - Phase 17 does not create redundant tables or duplicate data. Zero schema migrations required.

### API Endpoints

| Method | Endpoint | Description | Tenant Isolation |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/analytics` | Master consolidated dashboard dataset with all 8 KPI cards and 6 Recharts datasets | Enforced |
| `GET` | `/api/dashboard/summary` | Top-level high-impact summary metric cards (farms, fields, crops, workforce, financial totals) | Enforced |
| `GET` | `/api/dashboard/financial-overview` | Detailed financial standing (revenue, other income, expenses, profit/loss, margin, receivables, payables) | Enforced |
| `GET` | `/api/dashboard/income-expense-trend` | Periodic revenue vs operating expense trajectory | Enforced |
| `GET` | `/api/dashboard/expense-breakdown` | Category-wise expense allocations with percentage shares for pie/donut charts | Enforced |
| `GET` | `/api/dashboard/attendance-trend` | Daily workforce muster roll attendance logs (present, absent, half-day, logged hours) | Enforced |
| `GET` | `/api/dashboard/crop-distribution` | Cultivated crop variety acreage distribution and land utilization percentages | Enforced |
| `GET` | `/api/dashboard/harvest-trend` | Chronological crop yields and harvest quantities over time | Enforced |
| `GET` | `/api/dashboard/upcoming-activities` | Imminent high-priority farm calendar activities requiring owner attention | Enforced |

### Running Automated Tests
```bash
cd backend
venv\Scripts\python.exe test_dashboard.py
```
*(Tests multi-tenant isolation, decimal financial accounting, farm filter IDOR prevention, date range bounds, Recharts datasets, and sub-endpoints)*

---

## 📋 Phase Roadmap

| Phase | Milestone | Status |
| :--- | :--- | :--- |
| **Phase 1** | **Project Setup & Architecture** | **✅ COMPLETE** |
| **Phase 2** | **Database Design + PostgreSQL + Backend Foundation** | **✅ COMPLETE** |
| **Phase 3** | **Next.js Frontend Foundation + Layout + Navigation** | **✅ COMPLETE** |
| **Phase 4** | **Authentication (JWT + Secure Sessions + User Accounts)** | **✅ COMPLETE** |
| **Phase 5** | **Farm + Field Management (Estates, Plots, Ownership)** | **✅ COMPLETE** |
| **Phase 6** | **Crop Management (Cycles, Sowing, Varieties, Plots)** | **✅ COMPLETE** |
| **Phase 7** | **Labour Management (Workforce, Daily Wages, Status, Roster)** | **✅ COMPLETE** |
| **Phase 8** | **Attendance Management + Working Hours Calculation** | **✅ COMPLETE** |
| **Phase 9** | **Salary Management + Labour Payments** | **✅ COMPLETE** |
| **Phase 10** | **Fertilizer & Pesticide Management** | **✅ COMPLETE** |
| Phase 11 | Irrigation Management | ⏳ Next (Phase 11 Instruction Required) |
| **Phase 12** | **Farm Expense Management** | **✅ COMPLETE** |
| **Phase 13** | **Equipment / Machinery Management** | **✅ COMPLETE** |
| **Phase 14** | **Harvest Management** | **✅ COMPLETE** |
| **Phase 15** | **Crop Sales + Income + Profit Calculation** | **✅ COMPLETE** |
| **Phase 16** | **Farm Calendar Management** | **✅ COMPLETE** |
| **Phase 17** | **Dashboard Analytics + Recharts** | **✅ COMPLETE** |
| Phase 18 | Reports & Data Export | ⏳ Pending (Awaiting Approval) |
| Phase 19 | Notifications & Reminders | ⏳ Pending |
| Phase 20 | Testing, Validation, Security & UI Refinement | ⏳ Pending |
| Phase 21 | Production Preparation & Deployment | ⏳ Pending |





