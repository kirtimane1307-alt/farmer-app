# Phase 19: Notifications & Reminders Management Documentation

## Farm Management System (AgriCore)

---

### 1. Executive Summary

Phase 19 introduces a comprehensive, enterprise-grade **Notifications & Reminders Management System** into the Farm Management System. It empowers farmers and estate operators to monitor agricultural operations in real time, avoid missing critical seasonal tasks, track equipment service deadlines, manage financial liabilities, and configure custom recurring reminders.

The system is strictly driven by **real database records**—it evaluates actual crops, farm calendar activities, attendance logs, salary ledgers, equipment service logs, and expense liabilities. It strictly avoids generating fake notifications or corrupting operational state.

---

### 2. Technology Stack & Architecture

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide React Icons.
- **Backend:** FastAPI, Python 3.13, Pydantic v2, SQLAlchemy 2.0.
- **Background Scheduler:** APScheduler 3.11 (non-blocking in-process thread pool; no Redis/Celery required).
- **Database:** PostgreSQL (with SQLite compatibility in local development).
- **Database Migrations:** Alembic (Revision `0012_add_notifications_and_reminders_tables`).
- **Architecture:** Client (`/notifications` & `Header.tsx`) $\rightarrow$ FastAPI REST Endpoints $\rightarrow$ Notification & Scheduler Services $\rightarrow$ PostgreSQL.

---

### 3. Database Schema & Data Models

Three tables and database models were designed and synchronized into the system schema:

#### A. `notifications` Table
Stores system-generated and user-generated alerts.

| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, Indexed |
| `user_id` | UUID | Foreign Key $\rightarrow$ `users.id` (ON DELETE CASCADE), Indexed |
| `farm_id` | UUID | Foreign Key $\rightarrow$ `farms.id` (ON DELETE CASCADE), Nullable, Indexed |
| `title` | VARCHAR(255) | Notification headline |
| `message` | TEXT | Detailed message content |
| `category` | VARCHAR(50) | Indexed category (11 supported types) |
| `priority` | VARCHAR(20) | `low`, `medium`, `high`, `urgent` |
| `related_module`| VARCHAR(50) | Linked domain module (e.g. `crop`, `calendar`, `attendance`, `salary`, `equipment`) |
| `related_record_id` | VARCHAR(100) | Unique identifier for deduplication check |
| `action_url` | VARCHAR(255) | Deep-link to module (e.g. `/crops`, `/expenses`, `/salaries`) |
| `is_read` | BOOLEAN | Read flag (default `false`), Indexed |
| `read_at` | TIMESTAMPTZ | Timestamp when marked read |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Performance Indexes:**
- `idx_notif_user_read`: `(user_id, is_read)`
- `idx_notif_user_cat`: `(user_id, category)`
- `idx_notif_user_module_record`: `(user_id, related_module, related_record_id)`
- `idx_notif_user_created`: `(user_id, created_at)`

#### B. `reminders` Table
Stores custom user-defined agricultural reminders and recurring tasks.

| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, Indexed |
| `user_id` | UUID | Foreign Key $\rightarrow$ `users.id` (ON DELETE CASCADE), Indexed |
| `farm_id` | UUID | Foreign Key $\rightarrow$ `farms.id` (ON DELETE CASCADE), Nullable |
| `field_id` | UUID | Foreign Key $\rightarrow$ `fields.id` (ON DELETE SET NULL), Nullable |
| `crop_id` | UUID | Foreign Key $\rightarrow$ `crops.id` (ON DELETE SET NULL), Nullable |
| `title` | VARCHAR(255) | Reminder title |
| `description` | TEXT | Description or field instructions |
| `category` | VARCHAR(50) | Category key |
| `priority` | VARCHAR(20) | Operational urgency |
| `reminder_datetime` | TIMESTAMPTZ | Scheduled execution timestamp, Indexed |
| `recurrence_type` | VARCHAR(20) | `none`, `daily`, `weekly`, `monthly` |
| `recurrence_interval` | INTEGER | Recurrence interval factor (default 1) |
| `status` | VARCHAR(20) | `pending`, `completed`, `overdue`, `dismissed` |
| `completed_at` | TIMESTAMPTZ | Timestamp when marked completed |
| `next_run_at` | TIMESTAMPTZ | Next scheduled run for recurring reminders |
| `created_at` | TIMESTAMPTZ | Timestamp |
| `updated_at` | TIMESTAMPTZ | Timestamp |

**Performance Indexes:**
- `idx_reminder_user_status_datetime`: `(user_id, status, reminder_datetime)`

#### C. `notification_preferences` Table
Stores user-level toggles and advance notice windows per notification category.

| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `user_id` | UUID | Foreign Key $\rightarrow$ `users.id` (ON DELETE CASCADE), Indexed |
| `category` | VARCHAR(50) | Category key |
| `is_enabled` | BOOLEAN | Category toggle switch (default `true`) |
| `advance_notice_days` | INTEGER | Notice window in days: `0` (same day), `1`, `2`, `3`, `7` |
| `created_at` | TIMESTAMPTZ | Timestamp |
| `updated_at` | TIMESTAMPTZ | Timestamp |

**Unique Constraint:**
- `uq_user_notif_pref_category`: `(user_id, category)`

---

### 4. Automated Reminder Engine & Operational Scanner

The automated reminder engine (`scan_and_generate_alerts`) periodically evaluates real farm operational records and automatically generates non-duplicating notifications.

#### Supported Notification Categories:

1. **Crop Notifications (`crop`):**
   - **Sowing Dates:** Detects planned crops scheduled for sowing within the user's configured notice window.
   - **Approaching Harvest:** Detects crops reaching expected harvest date within the advance notice window.
   - **Overdue Harvest:** Flags growing crops whose expected harvest date has passed without harvest recording (Priority: `urgent`).

2. **Irrigation Reminders (`irrigation`):**
   - **Scheduled Watering:** Detects upcoming irrigation activities from the Farm Calendar.
   - **Missed Irrigation:** Flags planned irrigation events whose start time has passed without completion (Priority: `high`).

3. **Fertilizer & Pesticide Applications (`fertilizer_pesticide`):**
   - **Upcoming Applications:** Detects calendar spraying and fertilizer application tasks within notice window.
   - **Missed Applications:** Detects overdue applications (Priority: `high`).

4. **Labour & Attendance Notifications (`labour_attendance`):**
   - **Missing Daily Attendance:** Inspects active farm workers; if active labourers exist but zero attendance records have been registered for today, issues a daily alert.
   - **Deduplication:** Uses key `attendance-missing-{farm.id}-{today}` to guarantee that farmers are alerted at most once per day per farm.

5. **Salary & Payment Reminders (`salary_payment`):**
   - **Outstanding Wages:** Scans `SalaryRecord` entries with positive `outstanding_balance`.
   - **Overdue Wages:** Elevates priority to `high` if period end date is in the past.

6. **Harvest Notifications (`harvest`):**
   - Alerts regarding planned harvest activities, equipment readiness, and yield recording deadlines.

7. **Expense & Financial Reminders (`expense_finance`):**
   - **Unpaid Liabilities:** Detects expenses with `payment_status` in `('unpaid', 'partially_paid')` and positive balance.

8. **Equipment & Machinery Maintenance (`equipment_maintenance`):**
   - **Service Due:** Evaluates equipment `next_service_date` within the user's advance notice window.
   - **Service Overdue:** Flags equipment whose service date has passed (Priority: `urgent`).

9. **Farm Calendar Events (`calendar_event`):**
   - Alerts for general tasks, soil testing, inspections, and vendor appointments.

10. **Custom User Reminders (`custom_reminder`):**
    - Triggers notifications when user-created reminders become due or overdue.
    - Updates reminder status to `overdue` if past the scheduled timestamp.

#### Intelligent Deduplication & Anti-Spam Logic:
When scanning operations, the system evaluates:
$$\text{Existing Notification}(user\_id, related\_module, related\_record\_id)$$
If an alert for the same operational event already exists in an unread state or was created within the last 24 hours, creation is skipped. This prevents notification flooding during periodic background scans.

---

### 5. Background Scheduler Integration

- Integrated via `apscheduler.schedulers.background.BackgroundScheduler`.
- Initialized in FastAPI's `lifespan` manager in [backend/app/main.py](file:///c:/Users/Lenovo/OneDrive/Desktop/farm%202/backend/app/main.py).
- Runs an interval job `scheduled_farm_scan_job` every 10 minutes.
- Gracefully starts on application boot and shuts down on process exit.
- Includes manual on-demand trigger endpoint `POST /api/notifications/scan` for immediate evaluation.

---

### 6. API Reference

All endpoints are mounted under `/api` and require valid JWT bearer authentication.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/notifications` | List user notifications with filtering (category, priority, read status, farm, search, pagination). |
| `GET` | `/api/notifications/summary` | Telemetry counters: `total_notifications`, `unread_notifications`, `urgent_notifications`, `active_reminders`, `overdue_reminders`. |
| `PATCH` | `/api/notifications/{id}/read` | Mark single notification as read. |
| `POST` | `/api/notifications/mark-all-read` | Mark all notifications matching optional farm and category filters as read. |
| `DELETE`| `/api/notifications/{id}` | Delete a single notification owned by current user. |
| `POST` | `/api/notifications/scan` | Trigger manual operational scan and return generated alerts summary. |
| `GET` | `/api/reminders` | List custom reminders with status, category, priority, and farm filtering. |
| `POST` | `/api/reminders` | Create custom reminder with priority, datetime, and recurrence rules. |
| `GET` | `/api/reminders/{id}` | Get single reminder by ID. |
| `PUT` | `/api/reminders/{id}` | Update reminder fields, status, or schedule. |
| `PATCH` | `/api/reminders/{id}/complete` | Mark reminder completed (handles automatic recurrence rollover). |
| `DELETE`| `/api/reminders/{id}` | Delete reminder. |
| `GET` | `/api/notification-preferences` | Get user category preferences and advance notice windows. |
| `PUT` | `/api/notification-preferences` | Batch update category enabled status and notice days. |

---

### 7. Frontend User Interface

#### A. Header Notification Bell (`NotificationBellDropdown.tsx`)
- Located in the global top header [frontend/components/layout/Header.tsx](file:///c:/Users/Lenovo/OneDrive/Desktop/farm%202/frontend/components/layout/Header.tsx).
- Displays real-time unread badge counter (pulsing red for urgent alerts).
- Dropdown popover includes:
  - Header with unread count pill, "Scan & Check Now" refresh button, and "Mark read" button.
  - Scrollable feed of top unread alerts with category icons, priority badges, and relative timestamps.
  - Interactive row click to mark as read and navigate directly to target module (`/crops`, `/expenses`, `/salaries`, etc.).
  - "View all notifications & reminders $\rightarrow$" link leading to `/notifications`.

#### B. Dedicated Notifications Page (`/notifications`)
- Responsive dashboard matching AgriCore design guidelines.
- **Summary Cards (`NotificationSummaryCards.tsx`):**
  - Total Notifications
  - Unread Alerts
  - Active Reminders
  - Overdue Reminders
- **Dual Tab Architecture:**
  1. **Operational Notifications Tab:**
     - Sub-tabs: `All Notifications`, `Unread`, `Urgent & High`.
     - Category filter (11 types), Farm selector, Search query.
     - Bulk "Mark All Read" action.
     - "Scan & Check Now" button.
     - Delete action and module deep-link button.
  2. **Custom Reminders Tab:**
     - Sub-tabs: `All Reminders`, `Pending`, `Overdue`, `Completed`.
     - Farm and Priority filters.
     - "+ Create Reminder" button.
     - Checkbox button to mark completed.
     - Recurrence pill display (`Daily`, `Weekly`, `Monthly`).
     - Overdue status badge.
- **Reminder Form Modal (`ReminderFormModal.tsx`):**
  - Modal to create and edit reminders.
  - Farm & dynamic Field plot selectors.
  - Category and Priority selectors.
  - Native datetime-local picker.
  - Recurrence selector (None, Daily, Weekly, Monthly) and interval multiplier.
- **Notification Preferences Modal (`NotificationPreferencesModal.tsx`):**
  - Allows farmers to toggle each of the 11 operational categories on or off.
  - Configures custom advance notice windows ($0$, $1$, $2$, $3$, or $7$ days) per category.

---

### 8. Verification & Test Suite

The test suite [backend/test_notifications.py](file:///c:/Users/Lenovo/OneDrive/Desktop/farm%202/backend/test_notifications.py) validates the entire notification lifecycle:

```text
============================================================
Running Phase 19: Notifications & Reminders Test Suite
============================================================
[OK] Test users and farms established.
[TEST 1 PASSED] Notification creation and duplicate prevention verified.
[TEST 2 PASSED] Notification list and category/priority filters verified.
[TEST 3 PASSED] Mark as read and mark all as read verified.
[TEST 4 PASSED] Custom reminder CRUD and recurring rollover verified.
[TEST 5 PASSED] User notification preferences configuration verified.
[TEST 6 PASSED] Operational scan created 3 alert(s) from real farm data.
[TEST 7 PASSED] Multi-tenant isolation verified.
============================================================
ALL 7 PHASE 19 NOTIFICATIONS & REMINDERS TESTS PASSED SUCCESSFULLY!
============================================================
```

#### Regression Tests Verification:
- **Phase 18 Reports Test Suite (`test_reports.py`):** 12/12 passed (100%).
- **TypeScript Static Verification (`npx tsc --noEmit`):** 0 errors.
- **Next.js Page Build:** `/notifications` compiled and returned HTTP 200.

---

### 9. Multi-Tenant Security & Isolation

- Every notification, reminder, and preference row is strictly bound to `user_id`.
- Tenant isolation tests confirm that User A cannot list, view, update, or delete User B's notifications or reminders.
- Deep links and operational scans only access farms and fields owned by the authenticated user.

---

### 10. Boundaries & Next Steps

Phase 19 is fully completed, tested, and documented.
No changes have been made toward Phase 20. System is awaiting user review and approval before proceeding to subsequent phases.

