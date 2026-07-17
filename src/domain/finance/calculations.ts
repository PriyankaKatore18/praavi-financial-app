/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Department, GSTType, CostCategory, CostBasis, Settings } from "../../types";

const GST_ENABLED_ACCOUNT_IDS = new Set(["ba-sbi-current", "ba-axis-current"]);

export function accountUsesGST(accountId: string): boolean {
  return GST_ENABLED_ACCOUNT_IDS.has(accountId);
}

/**
 * Rounds a number to exactly 2 decimal places (paise precision).
 */
export function roundRupees(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Formats a number into Indian currency style (e.g. ₹3,86,000.00)
 */
export function formatIndianCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount).toFixed(2);
  const [integerPart, decimalPart] = absAmount.split(".");
  
  let lastThree = integerPart.slice(-3);
  const otherParts = integerPart.slice(0, -3);
  
  if (otherParts !== "") {
    lastThree = "," + lastThree;
  }
  
  const formattedInteger = otherParts.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  return `${isNegative ? "-" : ""}₹${formattedInteger}.${decimalPart}`;
}

/**
 * Interface representing the cost totals breakdown
 */
export interface DepartmentCosts {
  team_total: number;
  marketing_budget: number;
  management_share: number;
  overhead_share: number;
  cost_total: number;
  revenue_required: number;
}

/**
 * Calculates the revenue required for a given department.
 */
export function calculateDepartmentCosts(
  department: Department,
  costBasisList: CostBasis[],
  settings: Settings
): DepartmentCosts {
  // 1. Get team total salaries
  const teamCategory = department === Department.WEB_DEV 
    ? CostCategory.TEAM_WEBDEV 
    : CostCategory.TEAM_DM;
  
  const team_total = costBasisList
    .filter(c => c.category === teamCategory && c.is_active)
    .reduce((sum, c) => sum + c.monthly_amount, 0);

  // 2. Get marketing budget
  const marketing_budget = department === Department.WEB_DEV
    ? settings.webdev_marketing_budget
    : settings.dm_marketing_budget;

  // 3. Management total (shared 50% between both departments)
  const management_total = costBasisList
    .filter(c => c.category === CostCategory.MANAGEMENT && c.is_active)
    .reduce((sum, c) => sum + c.monthly_amount, 0);
  
  const management_share = roundRupees(management_total * 0.5);

  // 4. Overhead total (shared 50% between both departments)
  const overhead_total = costBasisList
    .filter(c => c.category === CostCategory.OVERHEAD && c.is_active)
    .reduce((sum, c) => sum + c.monthly_amount, 0);
  
  const overhead_share = roundRupees(overhead_total * 0.5);

  // 5. Cost total
  const cost_total = team_total + marketing_budget + management_share + overhead_share;

  // 6. Revenue required
  const revenue_required = roundRupees(cost_total / (1 - settings.target_profit_margin));

  return {
    team_total,
    marketing_budget,
    management_share,
    overhead_share,
    cost_total,
    revenue_required
  };
}

export interface EmployeeAllocation {
  employee_cost_basis_id: string;
  employee_name_snapshot: string;
  monthly_salary_snapshot: number;
  allocated_amount: number;
}

export interface DistributionResult {
  base_amount: number;
  gst_amount: number;
  salary_pool: number;
  total_salaries: number;
  
  // Overhead shares
  rent_share: number;
  car_emi_share: number;
  subscriptions_share: number;
  light_share: number;
  laptop_share: number;
  misc_share: number;
  
  // Combined overheads
  rent_emi_total: number;
  subscriptions_misc_total: number;
  total_overheads: number;
  
  usable_amount: number;
  marketing_amount: number;
  profit_amount: number;
  
  employee_shares: EmployeeAllocation[];
}

/**
 * Calculates the complete payment distribution.
 */
export function calculatePaymentDistribution(
  paymentAmount: number,
  department: Department,
  landedAccountId: string,
  gstType: GSTType,
  costBasisList: CostBasis[],
  settings: Settings,
  bankAccounts: { id: string; name: string }[]
): DistributionResult {
  const gst_pct = accountUsesGST(landedAccountId) ? 0.18 : 0;

  // 1. Base Amount & GST Amount calculation
  let base_amount = 0;
  let gst_amount = 0;

  if (gstType === GSTType.INCLUSIVE) {
    base_amount = roundRupees(paymentAmount / (1 + gst_pct));
    gst_amount = roundRupees(paymentAmount - base_amount);
  } else {
    base_amount = roundRupees(paymentAmount);
    gst_amount = roundRupees(paymentAmount * gst_pct);
  }

  // 2. Fetch costs for calculations
  const deptCosts = calculateDepartmentCosts(department, costBasisList, settings);
  const revenue_required = deptCosts.revenue_required;

  if (revenue_required <= 0) {
    return {
      base_amount,
      gst_amount,
      salary_pool: 0,
      total_salaries: 0,
      rent_share: 0,
      car_emi_share: 0,
      subscriptions_share: 0,
      light_share: 0,
      laptop_share: 0,
      misc_share: 0,
      rent_emi_total: 0,
      subscriptions_misc_total: 0,
      total_overheads: 0,
      usable_amount: 0,
      marketing_amount: 0,
      profit_amount: base_amount,
      employee_shares: []
    };
  }

  // Get Individual Overhead values
  const getOverheadValue = (name: string): number => {
    const item = costBasisList.find(c => c.category === CostCategory.OVERHEAD && c.name.toLowerCase().includes(name.toLowerCase()));
    return item ? item.monthly_amount : 0;
  };

  const rent = getOverheadValue("rent");
  const carEmi = getOverheadValue("car");
  const subscriptions = getOverheadValue("subscription");
  const light = getOverheadValue("light");
  const laptop = getOverheadValue("laptop");
  const misc = getOverheadValue("misc");

  // 3. Salary Pool (Total Salaries)
  // salary_pool = base_amount * (department team total + 50% management total) / revenue_required
  const dept_team_and_mgmt_total = deptCosts.team_total + deptCosts.management_share;
  const salary_pool = roundRupees(base_amount * dept_team_and_mgmt_total / revenue_required);
  const total_salaries = salary_pool;

  // 4. Overhead Allocation
  // each overhead_share = base_amount * (overhead_amount * 0.5) / revenue_required
  const rent_share = roundRupees(base_amount * (rent * 0.5) / revenue_required);
  const car_emi_share = roundRupees(base_amount * (carEmi * 0.5) / revenue_required);
  const subscriptions_share = roundRupees(base_amount * (subscriptions * 0.5) / revenue_required);
  const light_share = roundRupees(base_amount * (light * 0.5) / revenue_required);
  const laptop_share = roundRupees(base_amount * (laptop * 0.5) / revenue_required);
  const misc_share = roundRupees(base_amount * (misc * 0.5) / revenue_required);

  // Overheads Totals
  const rent_emi_total = roundRupees(base_amount * ((rent + carEmi) * 0.5) / revenue_required);
  const subscriptions_misc_total = roundRupees(base_amount * ((subscriptions + light + laptop + misc) * 0.5) / revenue_required);
  const total_overheads = rent_emi_total + subscriptions_misc_total;

  const usable_amount = total_salaries + total_overheads;

  // 5. Marketing Allocation
  const marketing_actual_pct = deptCosts.marketing_budget / revenue_required;
  const marketing_pct = Math.min(marketing_actual_pct, settings.marketing_cap_pct);
  const marketing_amount = roundRupees(base_amount * marketing_pct);

  // 6. Profit Allocation
  const profit_pct = settings.target_profit_margin + Math.max(0, marketing_actual_pct - settings.marketing_cap_pct);
  let profit_amount = roundRupees(base_amount * profit_pct);

  // 7. INVARIANT CHECK & ROUNDING ADJUSTMENT
  // usable_amount + marketing_amount + profit_amount = base_amount
  const sum_allocations = roundRupees(usable_amount + marketing_amount + profit_amount);
  const difference = roundRupees(base_amount - sum_allocations);

  if (Math.abs(difference) > 0.05) {
    console.error(`Invariant deviation warning! base_amount: ${base_amount}, sum: ${sum_allocations}, difference: ${difference}`);
  }

  // Inject difference into profit_amount to balance the ledger down to 1 paisa
  profit_amount = roundRupees(profit_amount + difference);

  // Double-verify invariant
  const verified_sum = roundRupees(usable_amount + marketing_amount + profit_amount);
  if (Math.abs(verified_sum - base_amount) > 0.01) {
    throw new Error(`Critical invariant violation! Usable (${usable_amount}) + Marketing (${marketing_amount}) + Profit (${profit_amount}) = ${verified_sum}, expected Base (${base_amount})`);
  }

  // 8. Individual Employee Proportional Shares
  const activeEmployees = costBasisList.filter(
    c => (c.category === CostCategory.TEAM_WEBDEV || 
          c.category === CostCategory.TEAM_DM || 
          c.category === CostCategory.MANAGEMENT) && 
         c.is_active
  );

  const company_total_salary = activeEmployees.reduce((sum, e) => sum + e.monthly_amount, 0);

  let employee_shares: EmployeeAllocation[] = [];
  let allocated_employee_sum = 0;

  if (company_total_salary > 0) {
    employee_shares = activeEmployees.map(emp => {
      // employee_share = salary_pool * employee monthly salary / company_total_salary
      const share = roundRupees(salary_pool * emp.monthly_amount / company_total_salary);
      allocated_employee_sum = roundRupees(allocated_employee_sum + share);
      return {
        employee_cost_basis_id: emp.id,
        employee_name_snapshot: emp.name,
        monthly_salary_snapshot: emp.monthly_amount,
        allocated_amount: share
      };
    });

    // Resolve employee rounding difference with salary_pool
    const emp_difference = roundRupees(salary_pool - allocated_employee_sum);
    if (Math.abs(emp_difference) > 0 && employee_shares.length > 0) {
      // Add rounding error to the employee with the largest salary.
      let largestIndex = 0;
      let largestSalary = 0;
      for (let i = 0; i < employee_shares.length; i++) {
        if (employee_shares[i].monthly_salary_snapshot > largestSalary) {
          largestSalary = employee_shares[i].monthly_salary_snapshot;
          largestIndex = i;
        }
      }
      employee_shares[largestIndex].allocated_amount = roundRupees(
        employee_shares[largestIndex].allocated_amount + emp_difference
      );
    }
  }

  return {
    base_amount,
    gst_amount,
    salary_pool,
    total_salaries,
    rent_share,
    car_emi_share,
    subscriptions_share,
    light_share,
    laptop_share,
    misc_share,
    rent_emi_total,
    subscriptions_misc_total,
    total_overheads,
    usable_amount,
    marketing_amount,
    profit_amount,
    employee_shares
  };
}
