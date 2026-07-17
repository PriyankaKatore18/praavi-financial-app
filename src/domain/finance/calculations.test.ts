/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Department, GSTType, CostCategory, CostBasis, Settings } from "../../types";
import { calculatePaymentDistribution, calculateDepartmentCosts } from "./calculations";

// Seeded mock data to match specifications
export const mockCostBasisList: CostBasis[] = [
  // Web Dev Team
  { id: "cb-prajakta", category: CostCategory.TEAM_WEBDEV, name: "Prajakta", monthly_amount: 27000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-abhi", category: CostCategory.TEAM_WEBDEV, name: "Abhi", monthly_amount: 25500, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-vaishnavee-web", category: CostCategory.TEAM_WEBDEV, name: "Vaishnavee", monthly_amount: 25000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-bhushan", category: CostCategory.TEAM_WEBDEV, name: "Bhushan", monthly_amount: 20000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-vipin", category: CostCategory.TEAM_WEBDEV, name: "Vipin", monthly_amount: 20000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-priyanka", category: CostCategory.TEAM_WEBDEV, name: "Priyanka", monthly_amount: 15000, is_active: true, created_at: "", updated_at: "" },

  // DM Team
  { id: "cb-shreyas", category: CostCategory.TEAM_DM, name: "Shreyas", monthly_amount: 35000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-prathamesh", category: CostCategory.TEAM_DM, name: "Prathamesh", monthly_amount: 22000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-shradhha", category: CostCategory.TEAM_DM, name: "Shradhha", monthly_amount: 18000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-ayush", category: CostCategory.TEAM_DM, name: "Ayush", monthly_amount: 21000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-vaishnavee-k", category: CostCategory.TEAM_DM, name: "Vaishnavee K", monthly_amount: 6000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-pratik", category: CostCategory.TEAM_DM, name: "Pratik", monthly_amount: 14000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-amrut", category: CostCategory.TEAM_DM, name: "Amrut", monthly_amount: 10000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-sumedh", category: CostCategory.TEAM_DM, name: "Sumedh", monthly_amount: 5000, is_active: true, created_at: "", updated_at: "" },

  // Management
  { id: "cb-pooja", category: CostCategory.MANAGEMENT, name: "Pooja", monthly_amount: 60000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-malhar", category: CostCategory.MANAGEMENT, name: "Malhar", monthly_amount: 35000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-vishal", category: CostCategory.MANAGEMENT, name: "Vishal", monthly_amount: 40000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-aryan", category: CostCategory.MANAGEMENT, name: "Aryan", monthly_amount: 15000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-tanuja", category: CostCategory.MANAGEMENT, name: "Tanuja", monthly_amount: 10000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-sakshi", category: CostCategory.MANAGEMENT, name: "Sakshi", monthly_amount: 18000, is_active: true, created_at: "", updated_at: "" },

  // Overheads
  { id: "cb-rent", category: CostCategory.OVERHEAD, name: "Rent", monthly_amount: 40000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-car-emi", category: CostCategory.OVERHEAD, name: "Car EMI", monthly_amount: 40000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-subscriptions", category: CostCategory.OVERHEAD, name: "Subscriptions", monthly_amount: 12000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-light-bill", category: CostCategory.OVERHEAD, name: "Light bill", monthly_amount: 11000, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-laptop-rentals", category: CostCategory.OVERHEAD, name: "Laptop rentals", monthly_amount: 13200, is_active: true, created_at: "", updated_at: "" },
  { id: "cb-misc", category: CostCategory.OVERHEAD, name: "Misc", monthly_amount: 7000, is_active: true, created_at: "", updated_at: "" },
];

export const mockSettings: Settings = {
  id: "s-1",
  target_profit_margin: 0.15,
  marketing_cap_pct: 0.12,
  current_month_number: 4, // e.g. July (if FY starts April)
  webdev_marketing_budget: 45000,
  dm_marketing_budget: 45000,
  financial_year_start_month: 4,
  currency_code: "INR",
  created_at: "",
  updated_at: ""
};

export const mockBankAccounts = [
  { id: "ba-sbi-current", name: "SBI Current" },
  { id: "ba-axis-current", name: "Axis Current" },
  { id: "ba-boi-savings", name: "BOI Savings (Pooja)" },
  { id: "ba-kotak", name: "Kotak (Rent/EMI)" },
  { id: "ba-janseva", name: "Janseva (Profit)" },
  { id: "ba-axis-savings", name: "Axis Savings" },
];

/**
 * Runs the critical unit tests specified in Section 5.6 & Section 16 of requirements.
 * Returns true if all tests pass, or throws an error if any test fails.
 */
export function runUnitTests(): { success: boolean; results: string[] } {
  const logs: string[] = [];
  logs.push("Starting financial engine validation suite...");

  // 1. Validate Department Revenue Required Calculations (Section 5.1)
  const webdevCosts = calculateDepartmentCosts(Department.WEB_DEV, mockCostBasisList, mockSettings);
  logs.push(`Web Dev Revenue Required: Expected ₹386,000.00, got ₹${webdevCosts.revenue_required.toFixed(2)}`);
  if (Math.abs(webdevCosts.revenue_required - 386000) > 0.01) {
    throw new Error(`Failed Web Dev revenue required. Expected 386000, got ${webdevCosts.revenue_required}`);
  }

  const dmCosts = calculateDepartmentCosts(Department.DIGITAL_MARKETING, mockCostBasisList, mockSettings);
  logs.push(`Digital Marketing Revenue Required: Expected ₹384,235.29, got ₹${dmCosts.revenue_required.toFixed(2)}`);
  if (Math.abs(dmCosts.revenue_required - 384235.29) > 0.1) {
    throw new Error(`Failed DM revenue required. Expected 384235.29, got ${dmCosts.revenue_required}`);
  }

  // 2. Validate Payment Distribution Algorithm (Section 5.6 Required Unit Test)
  // Input:
  // - Payment amount: ₹25,000
  // - Department: Web Development
  // - Landed account: SBI Current
  // - GST type: Inclusive
  const result = calculatePaymentDistribution(
    25000,
    Department.WEB_DEV,
    "ba-sbi-current",
    GSTType.INCLUSIVE,
    mockCostBasisList,
    mockSettings,
    mockBankAccounts
  );

  const checks = [
    { name: "Base amount", expected: 21186.44, got: result.base_amount },
    { name: "GST amount", expected: 3813.56, got: result.gst_amount },
    { name: "Total salaries", expected: 12157.50, got: result.total_salaries },
    { name: "Rent and EMI", expected: 2195.49, got: result.rent_emi_total },
    { name: "Subscriptions and misc", expected: 1185.56, got: result.subscriptions_misc_total },
    { name: "Usable amount", expected: 15538.55, got: result.usable_amount },
    { name: "Marketing", expected: 2469.92, got: result.marketing_amount },
    { name: "Profit", expected: 3177.97, got: result.profit_amount }
  ];

  for (const check of checks) {
    const errorMargin = Math.abs(check.expected - check.got);
    logs.push(`Test [${check.name}]: Expected ₹${check.expected.toFixed(2)}, got ₹${check.got.toFixed(2)} (Diff: ₹${errorMargin.toFixed(4)})`);
    if (errorMargin > 0.05) { // 5 paise margin max
      throw new Error(`Verification failed for ${check.name}! Expected ${check.expected}, got ${check.got}`);
    }
  }

  // 3. Test Invariant 1: usable_amount + marketing_amount + profit_amount = base_amount (Section 16)
  const sumOfShares = result.usable_amount + result.marketing_amount + result.profit_amount;
  logs.push(`Test [Allocation Invariant]: Usable + Marketing + Profit = ₹${sumOfShares.toFixed(2)}, Base = ₹${result.base_amount.toFixed(2)}`);
  if (Math.abs(sumOfShares - result.base_amount) > 0.01) {
    throw new Error(`Allocation Invariant violated! Sum: ${sumOfShares}, Base: ${result.base_amount}`);
  }

  // 4. Test Invariant 2: employee shares sum = salary_pool
  const sumOfEmpShares = result.employee_shares.reduce((s, e) => s + e.allocated_amount, 0);
  logs.push(`Test [Employee Share Invariant]: Sum of employee shares = ₹${sumOfEmpShares.toFixed(2)}, Salary Pool = ₹${result.salary_pool.toFixed(2)}`);
  if (Math.abs(sumOfEmpShares - result.salary_pool) > 0.01) {
    throw new Error(`Employee Share Invariant violated! Sum: ${sumOfEmpShares}, Salary Pool: ${result.salary_pool}`);
  }

  logs.push("✅ All core financial engine tests passed successfully!");
  return { success: true, results: logs };
}
