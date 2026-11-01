/**
 * Core Type Definitions for Farm Management System
 */

// ==========================================
// Generic API Response Envelopes
// ==========================================

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface SystemHealth {
  status: "healthy" | "degraded" | "down";
  project_name: string;
  version: string;
  environment: string;
  database?: string;
  database_connected: boolean;
}

// ==========================================
// Authentication & User
// ==========================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ==========================================
// Farm & Field Management
// ==========================================

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  location: string;
  total_area: number;
  area_unit: string;
  field_count?: number;
  created_at: string;
  updated_at: string;
}

export interface FarmCreatePayload {
  name: string;
  location: string;
  total_area: number;
  area_unit: string;
}

export interface FarmUpdatePayload {
  name?: string;
  location?: string;
  total_area?: number;
  area_unit?: string;
}

export interface FarmDeleteResponse {
  id: string;
  deleted: boolean;
  fields_removed: number;
  message: string;
}

export interface Field {
  id: string;
  farm_id: string;
  name: string;
  area: number;
  area_unit: string;
  soil_type?: string;
  irrigation_type?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface FieldCreatePayload {
  name: string;
  area: number;
  area_unit: string;
  soil_type?: string;
  irrigation_type?: string;
  description?: string;
}

export interface FieldUpdatePayload {
  name?: string;
  area?: number;
  area_unit?: string;
  soil_type?: string;
  irrigation_type?: string;
  description?: string;
}

export interface FieldDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

// ==========================================
// Crop Management
// ==========================================

export type CropStatus = "planned" | "growing" | "ready_to_harvest" | "harvested" | "failed";

export interface Crop {
  id: string;
  field_id: string;
  field_name?: string;
  farm_id?: string;
  farm_name?: string;
  name: string;
  variety: string;
  season?: string;
  sowing_date: string;
  expected_harvest_date?: string;
  actual_harvest_date?: string;
  status: CropStatus;
  planted_area?: number;
  planted_area_unit?: string;
  seed_quantity?: number;
  seed_unit?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CropCreatePayload {
  field_id?: string;
  name: string;
  variety: string;
  season?: string;
  sowing_date: string;
  expected_harvest_date?: string;
  actual_harvest_date?: string;
  status?: CropStatus;
  planted_area?: number;
  planted_area_unit?: string;
  seed_quantity?: number;
  seed_unit?: string;
  notes?: string;
}

export interface CropUpdatePayload {
  name?: string;
  variety?: string;
  season?: string;
  sowing_date?: string;
  expected_harvest_date?: string;
  actual_harvest_date?: string;
  status?: CropStatus;
  planted_area?: number;
  planted_area_unit?: string;
  seed_quantity?: number;
  seed_unit?: string;
  notes?: string;
}

export interface CropDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

// ==========================================
// Labour, Attendance & Salary
// ==========================================

export type LabourStatus = "active" | "inactive";

export interface Labour {
  id: string;
  farm_id: string;
  farm_name?: string;
  name: string;
  phone?: string;
  address?: string;
  work_type: string;
  daily_wage: number;
  joining_date: string;
  status: LabourStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LabourCreatePayload {
  farm_id?: string;
  name: string;
  phone?: string;
  address?: string;
  work_type?: string;
  daily_wage: number;
  joining_date: string;
  status?: LabourStatus;
  notes?: string;
}

export interface LabourUpdatePayload {
  name?: string;
  phone?: string;
  address?: string;
  work_type?: string;
  daily_wage?: number;
  joining_date?: string;
  status?: LabourStatus;
  notes?: string;
}

export interface LabourDeleteResponse {
  id: string;
  name?: string;
  deactivated: boolean;
  status: string;
  message: string;
}

export interface LabourStats {
  total_workers: number;
  active_workers: number;
  inactive_workers: number;
}

export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";

export interface Attendance {
  id: string;
  labour_id: string;
  labour_name?: string;
  farm_id?: string;
  farm_name?: string;
  work_type?: string;
  daily_wage?: number;
  attendance_date: string;
  status: AttendanceStatus;
  check_in?: string | null;
  check_out?: string | null;
  working_minutes: number;
  working_hours_formatted: string;
  overtime_minutes: number;
  overtime_hours_formatted: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceCreatePayload {
  labour_id?: string;
  attendance_date: string;
  status: AttendanceStatus;
  check_in?: string | null;
  check_out?: string | null;
  overtime_minutes?: number;
  notes?: string | null;
}

export interface AttendanceUpdatePayload {
  attendance_date?: string;
  status?: AttendanceStatus;
  check_in?: string | null;
  check_out?: string | null;
  overtime_minutes?: number;
  notes?: string | null;
}

export interface BulkAttendanceItemPayload {
  labour_id: string;
  status: AttendanceStatus;
  check_in?: string | null;
  check_out?: string | null;
  overtime_minutes?: number;
  notes?: string | null;
}

export interface BulkAttendancePayload {
  attendance_date: string;
  farm_id?: string;
  records: BulkAttendanceItemPayload[];
}

export interface BulkAttendanceResponse {
  attendance_date: string;
  total_submitted: number;
  created: number;
  updated: number;
  failed: number;
  records: Attendance[];
  errors: string[];
}

export interface AttendanceDailySummary {
  attendance_date: string;
  total_workers: number;
  present: number;
  absent: number;
  half_day: number;
  leave: number;
  unmarked: number;
  total_working_minutes: number;
  total_working_hours_formatted: string;
  total_overtime_minutes: number;
  total_overtime_hours_formatted: string;
}

// ==========================================
// Phase 9: Salary Management & Labour Payments
// ==========================================

export type SalaryStatus = "draft" | "generated" | "partially_paid" | "paid";
export type PaymentMethod = "cash" | "bank_transfer" | "upi" | "cheque" | "other";

export interface AttendanceBreakdown {
  total_days_in_period: number;
  attendance_records_count: number;
  present_days: number;
  half_days: number;
  absent_days: number;
  leave_days: number;
  unmarked_days: number;
  payable_units: number;
  total_overtime_minutes: number;
  total_overtime_hours_formatted: string;
}

export interface SalaryPayment {
  id: string;
  salary_record_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod | string;
  transaction_reference?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryRecord {
  id: string;
  labour_id: string;
  labour_name?: string | null;
  farm_id: string;
  farm_name?: string | null;
  period_start: string;
  period_end: string;
  daily_wage_snapshot: number;
  present_days: number;
  half_days: number;
  absent_days: number;
  leave_days: number;
  payable_units: number;
  regular_salary: number;
  overtime_pay: number;
  additional_earnings: number;
  deductions: number;
  gross_salary: number;
  net_salary: number;
  amount_paid: number;
  outstanding_balance: number;
  status: SalaryStatus;
  notes?: string | null;
  calculation_metadata?: string | null;
  payments: SalaryPayment[];
  created_at: string;
  updated_at: string;
}

export interface SalaryPreviewPayload {
  labour_id: string;
  period_start: string;
  period_end: string;
  approved_overtime_pay?: number;
  additional_earnings?: number;
  deductions?: number;
  notes?: string;
}

export interface SalaryPreviewResponse {
  labour_id: string;
  labour_name: string;
  farm_id: string;
  farm_name: string;
  work_type?: string | null;
  period_start: string;
  period_end: string;
  daily_wage_snapshot: number;
  attendance: AttendanceBreakdown;
  regular_salary: number;
  approved_overtime_pay: number;
  additional_earnings: number;
  deductions: number;
  gross_salary: number;
  net_salary: number;
  amount_paid: number;
  outstanding_balance: number;
  status: string;
  notes?: string | null;
  calculation_policy: string;
  is_already_generated: boolean;
  existing_salary_id?: string | null;
}

export interface SalaryCreatePayload {
  labour_id: string;
  period_start: string;
  period_end: string;
  approved_overtime_pay?: number;
  additional_earnings?: number;
  deductions?: number;
  notes?: string;
}

export interface SalaryUpdatePayload {
  approved_overtime_pay?: number;
  additional_earnings?: number;
  deductions?: number;
  notes?: string;
}

export interface SalaryPaymentPayload {
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  transaction_reference?: string;
  notes?: string;
}

export interface SalarySummary {
  total_salary_payable: number;
  total_amount_paid: number;
  total_outstanding_balance: number;
  paid_records_count: number;
  partially_paid_records_count: number;
  unpaid_records_count: number;
  total_records_count: number;
}

export interface SalaryDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}


// ==========================================
// Phase 10: Fertilizer & Pesticide Management
// ==========================================

export type ApplicationCategory = "fertilizer" | "pesticide";

export interface AgriculturalApplication {
  id: string;
  farm_id: string;
  farm_name?: string | null;
  field_id: string;
  field_name?: string | null;
  crop_id?: string | null;
  crop_name?: string | null;
  crop_variety?: string | null;
  application_category: ApplicationCategory;
  product_name: string;
  product_type: string;
  quantity: number;
  unit: string;
  unit_cost?: number | null;
  total_cost?: number | null;
  application_date: string;
  application_method?: string | null;
  purpose?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationCreatePayload {
  farm_id: string;
  field_id: string;
  crop_id?: string | null;
  application_category: ApplicationCategory;
  product_name: string;
  product_type: string;
  quantity: number;
  unit: string;
  unit_cost?: number | null;
  total_cost?: number | null;
  application_date: string;
  application_method?: string | null;
  purpose?: string | null;
  notes?: string | null;
}

export interface ApplicationUpdatePayload {
  farm_id?: string;
  field_id?: string;
  crop_id?: string | null;
  application_category?: ApplicationCategory;
  product_name?: string;
  product_type?: string;
  quantity?: number;
  unit?: string;
  unit_cost?: number | null;
  total_cost?: number | null;
  application_date?: string;
  application_method?: string | null;
  purpose?: string | null;
  notes?: string | null;
}

export interface ApplicationSummary {
  total_applications_count: number;
  fertilizer_applications_count: number;
  pesticide_applications_count: number;
  total_fertilizer_cost: number;
  total_pesticide_cost: number;
  total_combined_cost: number;
}

export interface ApplicationDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

// Backward-compatible type aliases
export type FertilizerUsage = AgriculturalApplication;
export type PesticideUsage = AgriculturalApplication;

// ==========================================
// Irrigation
// ==========================================

export interface IrrigationLog {
  id: number;
  field_id: number;
  crop_id?: number;
  irrigation_date: string;
  source: string;
  duration_hours: number;
  water_volume_liters?: number;
  cost: number;
  notes?: string;
  created_at: string;
}

// ==========================================
// ==========================================
// Phase 12: Expenses & Payments Management
// ==========================================

export type ExpenseCategory =
  | "labour"
  | "fertilizer"
  | "pesticide"
  | "seeds"
  | "irrigation"
  | "fuel"
  | "equipment"
  | "maintenance_and_repairs"
  | "transportation"
  | "electricity"
  | "water"
  | "rent_and_leasing"
  | "other";

export type ExpensePaymentStatus = "unpaid" | "partially_paid" | "paid";

export type ExpensePaymentMethod =
  | "cash"
  | "bank_transfer"
  | "upi"
  | "cheque"
  | "card"
  | "other";

export interface ExpensePayment {
  id: string;
  expense_id: string;
  amount: number;
  payment_date: string;
  payment_method: ExpensePaymentMethod | string;
  transaction_reference?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  farm_id: string;
  farm_name?: string | null;
  field_id?: string | null;
  field_name?: string | null;
  crop_id?: string | null;
  crop_name?: string | null;
  category: ExpenseCategory;
  category_label: string;
  title: string;
  description?: string | null;
  amount: number;
  amount_paid: number;
  outstanding_balance: number;
  expense_date: string;
  payment_status: ExpensePaymentStatus;
  payment_method?: ExpensePaymentMethod | string | null;
  vendor_name?: string | null;
  invoice_number?: string | null;
  transaction_reference?: string | null;
  notes?: string | null;
  created_by_id?: string | null;
  created_at: string;
  updated_at: string;
  payments?: ExpensePayment[];
}

export interface ExpenseCreatePayload {
  farm_id: string;
  field_id?: string | null;
  crop_id?: string | null;
  category: ExpenseCategory | string;
  title: string;
  description?: string | null;
  amount: number;
  expense_date: string;
  payment_status?: ExpensePaymentStatus;
  payment_method?: ExpensePaymentMethod | string | null;
  vendor_name?: string | null;
  invoice_number?: string | null;
  transaction_reference?: string | null;
  notes?: string | null;
  initial_payment?: boolean;
}

export interface ExpenseUpdatePayload {
  farm_id?: string;
  field_id?: string | null;
  crop_id?: string | null;
  category?: ExpenseCategory | string;
  title?: string;
  description?: string | null;
  amount?: number;
  expense_date?: string;
  payment_method?: ExpensePaymentMethod | string | null;
  vendor_name?: string | null;
  invoice_number?: string | null;
  transaction_reference?: string | null;
  notes?: string | null;
}

export interface ExpensePaymentCreatePayload {
  amount: number;
  payment_date: string;
  payment_method: ExpensePaymentMethod | string;
  transaction_reference?: string | null;
  notes?: string | null;
}

export interface CategoryBreakdownItem {
  category: ExpenseCategory | string;
  category_label: string;
  total_amount: number;
  percentage: number;
  count: number;
}

export interface HighestCategoryInfo {
  category: ExpenseCategory | string;
  category_label: string;
  total_amount: number;
}

export interface ExpenseSummary {
  total_expenses: number;
  total_paid: number;
  total_unpaid: number;
  total_partially_paid: number;
  expense_count: number;
  paid_count: number;
  unpaid_count: number;
  partially_paid_count: number;
  highest_category?: HighestCategoryInfo | null;
  category_breakdown: CategoryBreakdownItem[];
}

export interface ExpenseDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

// ==========================================
// Phase 13: Equipment & Machinery Management
// ==========================================

export type EquipmentCondition =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "damaged";

export type EquipmentStatus =
  | "available"
  | "in_use"
  | "under_maintenance"
  | "retired";

export type MaintenanceType =
  | "routine_service"
  | "preventive_maintenance"
  | "repair"
  | "inspection"
  | "parts_replacement"
  | "other";

export type EquipmentServiceStatus =
  | "overdue"
  | "due_soon"
  | "upcoming"
  | "ok"
  | "retired"
  | "not_scheduled";

export interface EquipmentMaintenance {
  id: string;
  equipment_id: string;
  equipment_name?: string | null;
  equipment_type?: string | null;
  farm_id?: string | null;
  farm_name?: string | null;
  maintenance_type: MaintenanceType | string;
  maintenance_type_label: string;
  service_date: string;
  description: string;
  service_provider?: string | null;
  parts_replaced?: string | null;
  cost?: number | null;
  downtime_minutes?: number | null;
  next_service_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  farm_id: string;
  farm_name?: string | null;
  field_id?: string | null;
  field_name?: string | null;
  equipment_name: string;
  equipment_type: string;
  brand?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  supplier_name?: string | null;
  quantity: number;
  condition: EquipmentCondition;
  operational_status: EquipmentStatus;
  fuel_type?: string | null;
  identification_number?: string | null;
  warranty_expiry_date?: string | null;
  last_service_date?: string | null;
  next_service_date?: string | null;
  service_status: EquipmentServiceStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  maintenance_count: number;
  total_maintenance_cost: number;
  maintenance_records?: EquipmentMaintenance[];
}

export interface EquipmentCreatePayload {
  farm_id: string;
  field_id?: string | null;
  equipment_name: string;
  equipment_type: string;
  brand?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  supplier_name?: string | null;
  quantity?: number;
  condition?: EquipmentCondition;
  operational_status?: EquipmentStatus;
  fuel_type?: string | null;
  identification_number?: string | null;
  warranty_expiry_date?: string | null;
  last_service_date?: string | null;
  next_service_date?: string | null;
  notes?: string | null;
}

export interface EquipmentUpdatePayload {
  farm_id?: string;
  field_id?: string | null;
  equipment_name?: string;
  equipment_type?: string;
  brand?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  supplier_name?: string | null;
  quantity?: number;
  condition?: EquipmentCondition;
  operational_status?: EquipmentStatus;
  fuel_type?: string | null;
  identification_number?: string | null;
  warranty_expiry_date?: string | null;
  last_service_date?: string | null;
  next_service_date?: string | null;
  notes?: string | null;
}

export interface EquipmentStatusUpdatePayload {
  operational_status: EquipmentStatus;
  condition?: EquipmentCondition;
  notes?: string | null;
}

export interface EquipmentMaintenanceCreatePayload {
  maintenance_type: MaintenanceType | string;
  service_date: string;
  description: string;
  service_provider?: string | null;
  parts_replaced?: string | null;
  cost?: number | null;
  downtime_minutes?: number | null;
  next_service_date?: string | null;
  notes?: string | null;
  update_equipment_status?: EquipmentStatus | string | null;
}

export interface EquipmentMaintenanceUpdatePayload {
  maintenance_type?: MaintenanceType | string;
  service_date?: string;
  description?: string;
  service_provider?: string | null;
  parts_replaced?: string | null;
  cost?: number | null;
  downtime_minutes?: number | null;
  next_service_date?: string | null;
  notes?: string | null;
}

export interface EquipmentSummary {
  total_equipment: number;
  available_count: number;
  in_use_count: number;
  under_maintenance_count: number;
  retired_count: number;
  upcoming_services_count: number;
  overdue_services_count: number;
  missing_service_date_count: number;
  total_purchase_value: number;
  total_maintenance_cost: number;
  by_type: Record<string, number>;
  by_condition: Record<string, number>;
  by_status: Record<string, number>;
}

export interface EquipmentDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

// ==========================================
// Harvest & Sales (Income & Profit)
// ==========================================

export interface Harvest {
  id: string;
  farm_id: string;
  farm_name?: string;
  field_id: string;
  field_name?: string;
  crop_id: string;
  crop_name?: string;
  crop_variety?: string;
  harvest_date: string;
  quantity: number;
  unit: string;
  quality_grade?: string;
  harvest_method?: string;
  storage_location?: string;
  batch_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HarvestFormData {
  farm_id?: string;
  field_id?: string;
  crop_id: string;
  harvest_date: string;
  quantity: number;
  unit: string;
  quality_grade?: string;
  harvest_method?: string;
  storage_location?: string;
  batch_number?: string;
  notes?: string;
}

export interface HarvestFilterParams {
  farm_id?: string;
  field_id?: string;
  crop_id?: string;
  start_date?: string;
  end_date?: string;
  unit?: string;
  quality_grade?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface CropHarvestSummary {
  crop_id: string;
  crop_name: string;
  crop_variety: string;
  harvest_count: number;
  quantities_by_unit: Record<string, number>;
  metric_weight_kg?: number;
}

export interface FieldHarvestSummary {
  field_id: string;
  field_name: string;
  harvest_count: number;
  quantities_by_unit: Record<string, number>;
  metric_weight_kg?: number;
}

export interface HarvestSummary {
  total_harvests: number;
  total_metric_weight_kg: number;
  by_unit: Record<string, number>;
  by_quality_grade: Record<string, number>;
  by_crop: CropHarvestSummary[];
  by_field: FieldHarvestSummary[];
  start_date?: string;
  end_date?: string;
}

export interface HarvestDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

// ==========================================
// Phase 15: Sales, Income & Profit/Loss
// ==========================================

export type SalePaymentStatus = "unpaid" | "partially_paid" | "paid";
export type SalePaymentMethod =
  | "cash"
  | "bank_transfer"
  | "upi"
  | "cheque"
  | "card"
  | "other";

export interface SalePayment {
  id: string;
  sale_id: string;
  amount: number;
  payment_date: string;
  payment_method: SalePaymentMethod | string;
  reference_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalePaymentCreatePayload {
  amount: number;
  payment_date: string;
  payment_method: SalePaymentMethod | string;
  reference_number?: string | null;
  notes?: string | null;
}

export interface Sale {
  id: string;
  farm_id: string;
  farm_name?: string | null;
  field_id?: string | null;
  field_name?: string | null;
  crop_id?: string | null;
  crop_name?: string | null;
  crop_variety?: string | null;
  harvest_id?: string | null;
  harvest_batch_number?: string | null;

  sale_number: string;
  sale_date: string;
  buyer_name: string;
  buyer_phone?: string | null;
  buyer_address?: string | null;

  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  gross_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  outstanding_amount: number;

  payment_status: SalePaymentStatus;
  payment_method?: SalePaymentMethod | string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  payments?: SalePayment[];
}

export interface SaleCreatePayload {
  farm_id: string;
  field_id?: string | null;
  crop_id?: string | null;
  harvest_id?: string | null;
  sale_number?: string | null;
  sale_date: string;
  buyer_name: string;
  buyer_phone?: string | null;
  buyer_address?: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_amount?: number;
  initial_payment_amount?: number | null;
  payment_method?: SalePaymentMethod | string | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface SaleUpdatePayload {
  sale_date?: string;
  buyer_name?: string;
  buyer_phone?: string | null;
  buyer_address?: string | null;
  product_name?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  discount_amount?: number;
  payment_method?: SalePaymentMethod | string | null;
  notes?: string | null;
}

export interface CropSalesSummary {
  crop_name: string;
  variety?: string | null;
  sales_count: number;
  quantity_sold: number;
  unit: string;
  total_revenue: number;
}

export interface SaleSummary {
  total_sales_count: number;
  total_revenue: number;
  total_gross: number;
  total_discount: number;
  total_received: number;
  total_outstanding: number;
  total_quantity_sold: number;
  paid_count: number;
  partially_paid_count: number;
  unpaid_count: number;
  top_buyer?: string | null;
  top_crop?: string | null;
  sales_by_crop: CropSalesSummary[];
}

export interface SaleDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

// ------------------------------------------
// Other Farm Income
// ------------------------------------------

export interface OtherIncome {
  id: string;
  farm_id: string;
  farm_name?: string | null;
  income_date: string;
  category: string;
  category_label: string;
  description: string;
  amount: number;
  source?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OtherIncomeCreatePayload {
  farm_id: string;
  income_date: string;
  category: string;
  description: string;
  amount: number;
  source?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface OtherIncomeUpdatePayload {
  farm_id?: string;
  income_date?: string;
  category?: string;
  description?: string;
  amount?: number;
  source?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface CategoryIncomeBreakdown {
  category: string;
  category_label: string;
  total_amount: number;
  percentage: number;
  count: number;
}

export interface OtherIncomeSummary {
  total_income: number;
  total_count: number;
  top_category?: string | null;
  category_breakdown: CategoryIncomeBreakdown[];
}

export interface IncomeDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

// ------------------------------------------
// Financial Summary & Profit/Loss
// ------------------------------------------

export interface MonthlyFinancialRecord {
  month: string;
  month_label: string;
  sales_revenue: number;
  other_income: number;
  total_income: number;
  total_expenses: number;
  net_profit_loss: number;
  is_profit: boolean;
}

export interface FinancialSummary {
  total_sales_revenue: number;
  total_other_income: number;
  total_income: number;
  total_expenses: number;
  net_profit_loss: number;
  is_profit: boolean;
  profit_margin_percentage: number;

  total_sales_received: number;
  outstanding_receivables: number;
  total_expenses_paid: number;
  outstanding_payables: number;

  total_sales_count: number;
  total_income_count: number;
  total_expenses_count: number;

  monthly_breakdown: MonthlyFinancialRecord[];

  farm_id?: string | null;
  farm_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  disclaimer: string;
}

// ==========================================
// Dashboard Analytics & Summary
// ==========================================

export interface DashboardSummary {
  total_farms: number;
  total_fields: number;
  active_crops: number;
  total_labour: number;
  today_attendance: {
    present: number;
    absent: number;
    half_day: number;
    total: number;
  };
  pending_salaries: number;
  current_month_expenses: number;
  current_month_income: number;
  current_month_profit_loss: number;
}

// ==========================================
// Phase 16: Farm Calendar Management
// ==========================================

export type CalendarActivityType =
  | "general_task"
  | "land_preparation"
  | "sowing"
  | "transplanting"
  | "fertilizer_application"
  | "pesticide_application"
  | "irrigation"
  | "weeding"
  | "pruning"
  | "crop_inspection"
  | "labour_assignment"
  | "harvesting"
  | "equipment_maintenance"
  | "sales_appointment"
  | "other";

export type CalendarEventStatus = "planned" | "in_progress" | "completed" | "cancelled";

export type CalendarEventPriority = "low" | "medium" | "high";

export interface CalendarEvent {
  id: string;
  farm_id: string;
  field_id?: string | null;
  crop_id?: string | null;
  assigned_labour_id?: string | null;
  created_by_id?: string | null;
  title: string;
  description?: string | null;
  activity_type: CalendarActivityType | string;
  start_datetime: string;
  end_datetime?: string | null;
  all_day: boolean;
  status: CalendarEventStatus | string;
  priority: CalendarEventPriority | string;
  related_module?: string | null;
  related_record_id?: string | null;
  actual_completion_datetime?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;

  // Resolved display metadata
  farm_name?: string | null;
  field_name?: string | null;
  crop_name?: string | null;
  assigned_labour_name?: string | null;
  created_by_name?: string | null;
}

export interface CalendarEventCreatePayload {
  farm_id: string;
  field_id?: string | null;
  crop_id?: string | null;
  assigned_labour_id?: string | null;
  title: string;
  description?: string | null;
  activity_type: CalendarActivityType | string;
  start_datetime: string;
  end_datetime?: string | null;
  all_day?: boolean;
  status?: CalendarEventStatus | string;
  priority?: CalendarEventPriority | string;
  related_module?: string | null;
  related_record_id?: string | null;
  actual_completion_datetime?: string | null;
  notes?: string | null;
}

export interface CalendarEventUpdatePayload {
  farm_id?: string;
  field_id?: string | null;
  crop_id?: string | null;
  assigned_labour_id?: string | null;
  title?: string;
  description?: string | null;
  activity_type?: CalendarActivityType | string;
  start_datetime?: string;
  end_datetime?: string | null;
  all_day?: boolean;
  status?: CalendarEventStatus | string;
  priority?: CalendarEventPriority | string;
  related_module?: string | null;
  related_record_id?: string | null;
  actual_completion_datetime?: string | null;
  notes?: string | null;
}

export interface CalendarEventStatusPayload {
  status: CalendarEventStatus | string;
  actual_completion_datetime?: string | null;
  notes?: string | null;
}

export interface CalendarSummary {
  total_events: number;
  planned_count: number;
  in_progress_count: number;
  completed_count: number;
  cancelled_count: number;
  overdue_count: number;
  high_priority_count: number;
  activity_breakdown: Record<string, number>;
}

export interface CalendarFilterParams {
  start_date?: string;
  end_date?: string;
  farm_id?: string;
  field_id?: string;
  crop_id?: string;
  activity_type?: string;
  status?: string;
  priority?: string;
  assigned_labour_id?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

// ==========================================
// Phase 18: Reports Management
// ==========================================

export type ReportCategoryKey =
  | "farm_summary"
  | "crop"
  | "labour"
  | "attendance"
  | "salary"
  | "fertilizer_pesticide"
  | "irrigation"
  | "expense"
  | "machinery"
  | "harvest"
  | "sales_income"
  | "financial_summary";

export type DatePresetKey =
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "previous_month"
  | "this_year"
  | "custom"
  | "all_time";

export interface ReportingPeriodInfo {
  label: string;
  start_date?: string | null;
  end_date?: string | null;
  preset?: string | null;
}

export interface ReportMetadataInfo {
  report_category: string;
  report_title: string;
  farm_id?: string | null;
  farm_name: string;
  period: ReportingPeriodInfo;
  generated_at: string;
  total_records: number;
}

export interface ReportsOverview {
  total_categories: number;
  available_farms_count: number;
  total_fields_count: number;
  active_crops_count: number;
  total_labour_count: number;
  total_sales_revenue: number;
  total_other_income: number;
  total_income: number;
  total_expenses: number;
  recorded_profit_loss: number;
  is_profit: boolean;
  profit_margin_percentage: number;
}

export interface UnifiedReportData {
  metadata: ReportMetadataInfo;
  category: ReportCategoryKey;
  summary_cards: Record<string, any>;
  table_headers: string[];
  table_rows: Record<string, any>[];
  data?: any;
}

export interface ReportFilterOptions {
  category: ReportCategoryKey;
  farm_id?: string;
  field_id?: string;
  crop_id?: string;
  labour_id?: string;
  expense_category?: string;
  status?: string;
  preset?: DatePresetKey;
  start_date?: string;
  end_date?: string;
}

// ==========================================
// Phase 19: Notifications & Reminders
// ==========================================

export type NotificationCategory =
  | "crop"
  | "irrigation"
  | "fertilizer_pesticide"
  | "labour_attendance"
  | "salary_payment"
  | "harvest"
  | "expense_finance"
  | "equipment_maintenance"
  | "calendar_event"
  | "custom_reminder"
  | "general";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export type ReminderRecurrence = "none" | "daily" | "weekly" | "monthly";

export type ReminderStatus = "pending" | "completed" | "dismissed" | "overdue";

export interface NotificationItem {
  id: string;
  user_id: string;
  farm_id?: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  related_module?: string | null;
  related_record_id?: string | null;
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  farm_name?: string | null;
}

export interface NotificationSummary {
  total_notifications: number;
  unread_notifications: number;
  urgent_notifications: number;
  active_reminders: number;
  overdue_reminders: number;
}

export interface ReminderItem {
  id: string;
  user_id: string;
  farm_id?: string | null;
  field_id?: string | null;
  crop_id?: string | null;
  title: string;
  description?: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  reminder_datetime: string;
  recurrence_type: ReminderRecurrence;
  recurrence_interval: number;
  status: ReminderStatus;
  completed_at?: string | null;
  next_run_at?: string | null;
  created_at: string;
  updated_at: string;
  farm_name?: string | null;
  field_name?: string | null;
  crop_name?: string | null;
}

export interface ReminderCreateInput {
  title: string;
  description?: string;
  farm_id?: string;
  field_id?: string;
  crop_id?: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  reminder_datetime: string;
  recurrence_type?: ReminderRecurrence;
  recurrence_interval?: number;
}

export interface ReminderUpdateInput {
  title?: string;
  description?: string;
  farm_id?: string;
  field_id?: string;
  crop_id?: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  reminder_datetime?: string;
  recurrence_type?: ReminderRecurrence;
  recurrence_interval?: number;
  status?: ReminderStatus;
}

export interface NotificationPreferenceItem {
  category: NotificationCategory;
  is_enabled: boolean;
  advance_notice_days: number;
}

export interface ScanResults {
  scanned_at: string;
  notifications_created: number;
  reminders_evaluated: number;
  details: string[];
}


