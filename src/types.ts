/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ACCOUNTANT = "accountant",
  FINANCE_HEAD = "finance_head",
  ADMIN = "admin"
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  password_hash?: string; // Excluded in frontend responses
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export enum CostCategory {
  TEAM_WEBDEV = "team_webdev",
  TEAM_DM = "team_dm",
  MANAGEMENT = "management",
  OVERHEAD = "overhead"
}

export interface CostBasis {
  id: string;
  category: CostCategory;
  name: string;
  monthly_amount: number; // in Rupees
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: string;
  target_profit_margin: number; // default 0.15
  marketing_cap_pct: number; // default 0.12
  current_month_number: number; // current month count (e.g. 4 for July if starting April)
  webdev_marketing_budget: number; // default 45000
  dm_marketing_budget: number; // default 45000
  financial_year_start_month: number; // default 4 (April)
  currency_code: string; // default INR
  created_at: string;
  updated_at: string;
}

export enum AccountType {
  BANK = "bank",
  MARKETING_CARD = "marketing_card"
}

export interface Account {
  id: string;
  name: string;
  account_type: AccountType;
  opening_balance: number;
  actual_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed (not stored)
  sheet_balance?: number;
  variance?: number;
  inflows?: number;
  outflows?: number;
}

export interface MarketingCard {
  id: string;
  name: string;
  department: "web_dev" | "digital_marketing";
  opening_balance: number;
  actual_balance: number;
  created_at: string;
  updated_at: string;
  // Computed (not stored)
  card_balance?: number;
  variance?: number;
}

export enum Department {
  WEB_DEV = "web_dev",
  DIGITAL_MARKETING = "digital_marketing"
}

export enum GSTType {
  INCLUSIVE = "inclusive",
  EXCLUSIVE = "exclusive"
}

export interface Payment {
  id: string;
  department: Department;
  client_name: string;
  payment_amount: number;
  landed_in_account_id: string;
  gst_type: GSTType;
  gst_pct: number;
  money_spent: boolean; // toggle for salary pool exclusion
  payment_date: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Includes distribution and transfers in detail responses
  distribution?: PaymentDistribution;
  transfers?: DistributionTransfer[];
}

export interface PaymentDistribution {
  id: string;
  payment_id: string;
  base_amount: number;
  gst_amount: number;
  salary_pool: number;
  total_salaries: number;
  rent_share: number;
  car_emi_share: number;
  subscriptions_share: number;
  light_share: number;
  laptop_share: number;
  misc_share: number;
  rent_emi_total: number;
  subscriptions_misc_total: number;
  total_overheads: number;
  usable_amount: number;
  marketing_amount: number;
  profit_amount: number;
  created_at: string;
  employee_shares?: EmployeePaymentShare[];
}

export interface EmployeePaymentShare {
  id: string;
  payment_id: string;
  employee_cost_basis_id: string;
  employee_name_snapshot: string;
  monthly_salary_snapshot: number;
  allocated_amount: number;
  created_at: string;
}

export enum TransferType {
  RENT_EMI = "rent_emi",
  SUBSCRIPTIONS_MISC = "subscriptions_misc",
  PROFIT = "profit",
  MARKETING = "marketing"
}

export enum TransferStatus {
  PENDING = "pending",
  TRANSFERRED = "transferred"
}

export interface DistributionTransfer {
  id: string;
  payment_id: string;
  transfer_type: TransferType;
  source_account_id: string;
  destination_account_id?: string;
  marketing_card_id?: string;
  amount: number;
  status: TransferStatus;
  transferred_at?: string;
  transferred_by?: string;
  created_at: string;
  updated_at: string;
  // UI helpers
  payment_client_name?: string;
  payment_date?: string;
}

export interface TransferLog {
  id: string;
  date: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  purpose: string;
  reference_number?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export enum ReimbursementStatus {
  PENDING = "pending",
  REIMBURSED = "reimbursed"
}

export interface ReimbursementLog {
  id: string;
  date: string;
  spent_from_account_id: string;
  amount: number;
  category_note: string;
  reimbursed_by_account_id?: string;
  purpose: string;
  status: ReimbursementStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export enum PayrollStatus {
  PENDING = "pending",
  PAID = "paid"
}

export interface PayrollDisbursementLog {
  id: string;
  employee_name: string;
  employee_cost_basis_id: string;
  amount: number;
  status: PayrollStatus;
  paid_from_account_id?: string;
  scheduled_date: string;
  paid_date?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export enum ArrearsStatus {
  PENDING = "pending",
  PAID = "paid"
}

export interface SalaryPoolArrearsLedger {
  id: string;
  employee_name: string;
  employee_cost_basis_id: string;
  amount_owed: number;
  status: ArrearsStatus;
  paid_from_account_id?: string;
  entry_date: string;
  date_paid?: string;
  note?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryPoolPersonOwed {
  id: string;
  employee_name: string;
  employee_cost_basis_id: string;
  amount_owed: number;
  note?: string;
  created_at: string;
  updated_at: string;
}

export enum DrawingType {
  BANK_ACCOUNT = "bank_account",
  MARKETING_CARD = "marketing_card"
}

export interface Drawing {
  id: string;
  account_id?: string;
  marketing_card_id?: string;
  drawing_type: DrawingType;
  amount: number;
  drawing_date: string;
  category: string;
  purpose: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string; // UI join helper
  action: string;
  entity_type: string;
  entity_id: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ImportBatch {
  id: string;
  date: string;
  import_type: string;
  file_name: string;
  row_count: number;
  created_by: string;
}
