/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "./db";
import { roundRupees } from "../src/domain/finance/calculations";
import { 
  Department, TransferStatus, ReimbursementStatus, PayrollStatus, ArrearsStatus, 
  Account, MarketingCard, Payment, DrawingType, TransferType
} from "../src/types";

/**
 * Computes the complete balances, inflows, and outflows for all accounts.
 * This implements the Bank Account Balance Engine (Section 10).
 */
export function computeBankBalances(): Account[] {
  const accounts = db.accounts.findMany();
  const payments = db.payments.findMany();
  const distributions = db.payment_distributions.findMany();
  const manualTransfers = db.transfers_log.findMany();
  const distributionTransfers = db.distribution_transfers.findMany();
  const reimbursements = db.reimbursement_log.findMany();
  const payrolls = db.payroll_disbursement_log.findMany();
  const arrears = db.salary_pool_arrears_ledger.findMany();
  const drawings = db.drawings.findMany();

  return accounts.map(acc => {
    let inflows = 0;
    let outflows = 0;

    // 1. Gross Client Payments landed in this account
    const directPayments = payments.filter(p => p.landed_in_account_id === acc.id);
    for (const p of directPayments) {
      inflows += p.payment_amount;
    }

    // 2. Manual transfers received & sent
    const receivedTransfers = manualTransfers.filter(t => t.to_account_id === acc.id);
    for (const t of receivedTransfers) {
      inflows += t.amount;
    }
    const sentTransfers = manualTransfers.filter(t => t.from_account_id === acc.id);
    for (const t of sentTransfers) {
      outflows += t.amount;
    }

    // 3. Completed distribution transfers received & sent
    const receivedDistTransfers = distributionTransfers.filter(
      t => t.destination_account_id === acc.id && t.status === TransferStatus.TRANSFERRED
    );
    for (const t of receivedDistTransfers) {
      inflows += t.amount;
    }
    const sentDistTransfers = distributionTransfers.filter(
      t => t.source_account_id === acc.id && t.status === TransferStatus.TRANSFERRED
    );
    for (const t of sentDistTransfers) {
      outflows += t.amount;
    }

    // 4. Reimbursements
    // Reimbursement received (net positive for spending account)
    const receivedReimbursements = reimbursements.filter(
      r => r.spent_from_account_id === acc.id && r.status === ReimbursementStatus.REIMBURSED
    );
    for (const r of receivedReimbursements) {
      inflows += r.amount; // original spender gets credited (reimbursed)
    }
    // Reimbursing account paid (net outflow)
    const paidReimbursements = reimbursements.filter(
      r => r.reimbursed_by_account_id === acc.id && r.status === ReimbursementStatus.REIMBURSED
    );
    for (const r of paidReimbursements) {
      outflows += r.amount; // funding account pays out
    }
    // Spender account spent (outflow originally)
    const spentReimbursements = reimbursements.filter(r => r.spent_from_account_id === acc.id);
    for (const r of spentReimbursements) {
      outflows += r.amount; // original expense paid out
    }

    // 5. Completed payroll disbursements
    const paidPayrolls = payrolls.filter(p => p.paid_from_account_id === acc.id && p.status === PayrollStatus.PAID);
    for (const p of paidPayrolls) {
      outflows += p.amount;
    }

    // 6. Completed salary arrears payments
    const paidArrears = arrears.filter(a => a.paid_from_account_id === acc.id && a.status === ArrearsStatus.PAID);
    for (const a of paidArrears) {
      outflows += a.amount_owed;
    }

    // 7. Manual drawings (bank account type)
    const bankDrawings = drawings.filter(d => d.account_id === acc.id && d.drawing_type === DrawingType.BANK_ACCOUNT);
    for (const d of bankDrawings) {
      outflows += d.amount;
    }

    // Final balance computations
    const sheet_balance = roundRupees(acc.opening_balance + inflows - outflows);
    const variance = roundRupees(sheet_balance - acc.actual_balance);

    return {
      ...acc,
      sheet_balance,
      variance,
      inflows: roundRupees(inflows),
      outflows: roundRupees(outflows)
    };
  });
}

/**
 * Computes marketing card balances, inflows, and outflows.
 * This implements the Marketing Card Balance Engine (Section 11).
 */
export function computeMarketingCardBalances(): MarketingCard[] {
  const cards = db.marketing_cards.findMany();
  const distributionTransfers = db.distribution_transfers.findMany();
  const drawings = db.drawings.findMany();

  return cards.map(card => {
    // Inflows: Completed marketing transfers (status === 'transferred')
    const inflows = distributionTransfers
      .filter(t => t.marketing_card_id === card.id && t.status === TransferStatus.TRANSFERRED)
      .reduce((sum, t) => sum + t.amount, 0);

    // Outflows: Advertising drawings (drawing_type === 'marketing_card' and marketing_card_id matches)
    const outflows = drawings
      .filter(d => d.marketing_card_id === card.id && d.drawing_type === DrawingType.MARKETING_CARD)
      .reduce((sum, d) => sum + d.amount, 0);

    const card_balance = roundRupees(card.opening_balance + inflows - outflows);
    const variance = roundRupees(card_balance - card.actual_balance);

    return {
      ...card,
      card_balance,
      variance
    };
  });
}

/**
 * Computes Salary Pool stats and arrears ledger.
 * This implements the Salary Pool Tracker (Section 9).
 */
export interface SalaryPoolSummary {
  available_pool: number;
  paid_from_pool: number;
  pending_arrears: number;
  remaining_pool: number;
  pending_employees_count: number;
}

export function computeSalaryPool(): SalaryPoolSummary {
  const payments = db.payments.findMany();
  const distributions = db.payment_distributions.findMany();
  const payrolls = db.payroll_disbursement_log.findMany();
  const arrears = db.salary_pool_arrears_ledger.findMany();
  const personOwed = db.salary_pool_person_owed.findMany();

  // 1. available_pool = sum(total_salaries) from payments where money_spent = false
  let available_pool = 0;
  for (const p of payments) {
    if (!p.money_spent) {
      const dist = distributions.find(d => d.payment_id === p.id);
      if (dist) {
        available_pool += dist.salary_pool;
      }
    }
  }
  available_pool = roundRupees(available_pool);

  // 2. paid_from_pool = sum(payrolls paid) + sum(arrears paid)
  const totalPaidPayrolls = payrolls
    .filter(p => p.status === PayrollStatus.PAID)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaidArrears = arrears
    .filter(a => a.status === ArrearsStatus.PAID)
    .reduce((sum, a) => sum + a.amount_owed, 0);
  
  const paid_from_pool = roundRupees(totalPaidPayrolls + totalPaidArrears);

  // 3. pending_arrears = sum(arrears pending) + sum(payroll pending)
  const pendingArrears = arrears
    .filter(a => a.status === ArrearsStatus.PENDING)
    .reduce((sum, a) => sum + a.amount_owed, 0);
  
  const pendingPayroll = payrolls
    .filter(p => p.status === PayrollStatus.PENDING)
    .reduce((sum, p) => sum + p.amount, 0);

  const pending_arrears = roundRupees(pendingArrears + pendingPayroll);

  // 4. remaining_pool = available_pool - paid_from_pool
  const remaining_pool = roundRupees(available_pool - paid_from_pool);

  // 5. employee count with pending arrears
  // Outstanding arrears calculation:
  // For each employee, total arrears owed (salary_pool_person_owed) - paid arrears rows
  const employeePendingMap = new Map<string, number>();
  for (const po of personOwed) {
    employeePendingMap.set(po.employee_cost_basis_id, po.amount_owed);
  }

  // Subtract paid arrears
  const paidArrearsByEmp = arrears.filter(a => a.status === ArrearsStatus.PAID);
  for (const a of paidArrearsByEmp) {
    const cur = employeePendingMap.get(a.employee_cost_basis_id) || 0;
    employeePendingMap.set(a.employee_cost_basis_id, roundRupees(cur - a.amount_owed));
  }

  // Also subtract paid payrolls as salary paid
  const paidPayrollsByEmp = payrolls.filter(p => p.status === PayrollStatus.PAID);
  for (const p of paidPayrollsByEmp) {
    const cur = employeePendingMap.get(p.employee_cost_basis_id) || 0;
    employeePendingMap.set(p.employee_cost_basis_id, roundRupees(cur - p.amount));
  }

  let pending_employees_count = 0;
  employeePendingMap.forEach((pendingVal) => {
    if (pendingVal > 0.01) {
      pending_employees_count++;
    }
  });

  return {
    available_pool,
    paid_from_pool,
    pending_arrears,
    remaining_pool,
    pending_employees_count
  };
}

/**
 * Coverage item stats
 */
export interface CoverageItemStats {
  name: string;
  monthly_target: number;
  cumulative_target: number;
  covered_amount: number;
  remaining_gap: number;
  surplus_amount: number;
  percentage: number;
  status_color: "red" | "amber" | "green" | "blue";
}

/**
 * Computes coverage stats for each department.
 * This implements the Coverage Tracker (Section 8).
 */
export function computeCoverageTracker(
  department: Department,
  currentMonth: number
): CoverageItemStats[] {
  const costBasis = db.cost_basis.findMany();
  const distributions = db.payment_distributions.findMany();
  const payments = db.payments.findMany();

  // Get settings
  const settings = db.settings.findUnique();

  // Filter payments by department
  const deptPayments = payments.filter(p => p.department === department);
  const deptPaymentIds = deptPayments.map(p => p.id);
  const deptDistributions = distributions.filter(d => deptPaymentIds.includes(d.payment_id));

  // Determine marketing budget target
  const marketingBudget = department === Department.WEB_DEV
    ? settings.webdev_marketing_budget
    : settings.dm_marketing_budget;

  // Compute total team salary target
  const teamCategory = department === Department.WEB_DEV
    ? "team_webdev"
    : "team_dm";
  const teamSalaries = costBasis
    .filter(c => c.category === teamCategory && c.is_active)
    .reduce((sum, c) => sum + c.monthly_amount, 0);

  // Management salaries (shared 50% between both departments)
  const mgmtSalaries = costBasis
    .filter(c => c.category === "management" && c.is_active)
    .reduce((sum, c) => sum + c.monthly_amount, 0);
  const mgmt_target = mgmtSalaries * 0.5;

  // Overhead values
  const getOverheadVal = (name: string): number => {
    const item = costBasis.find(c => c.category === "overhead" && c.name.toLowerCase().includes(name.toLowerCase()));
    return item ? item.monthly_amount * 0.5 : 0;
  };

  const targetsMap = {
    "Salaries": teamSalaries + mgmt_target,
    "Rent": getOverheadVal("rent"),
    "Car EMI": getOverheadVal("car"),
    "Subscriptions": getOverheadVal("subscription"),
    "Light bill": getOverheadVal("light"),
    "Laptop rentals": getOverheadVal("laptop"),
    "Miscellaneous expenses": getOverheadVal("misc"),
    "Marketing": marketingBudget,
    "Profit": 0 // Calculated dynamically based on revenue target
  };

  // Profit target is target profit margin share of revenue required
  // revenue_required = total_costs / (1 - margin)
  // profit = revenue_required * margin
  const totalCosts = targetsMap["Salaries"] + targetsMap["Rent"] + targetsMap["Car EMI"] + targetsMap["Subscriptions"] + targetsMap["Light bill"] + targetsMap["Laptop rentals"] + targetsMap["Miscellaneous expenses"] + targetsMap["Marketing"];
  const revenueRequired = totalCosts / (1 - settings.target_profit_margin);
  targetsMap["Profit"] = roundRupees(revenueRequired * settings.target_profit_margin);

  // Compute actual covered so far across historical payments
  const coveredMap: Record<string, number> = {
    "Salaries": 0,
    "Rent": 0,
    "Car EMI": 0,
    "Subscriptions": 0,
    "Light bill": 0,
    "Laptop rentals": 0,
    "Miscellaneous expenses": 0,
    "Marketing": 0,
    "Profit": 0
  };

  for (const d of deptDistributions) {
    coveredMap["Salaries"] += d.salary_pool;
    coveredMap["Rent"] += d.rent_share;
    coveredMap["Car EMI"] += d.car_emi_share;
    coveredMap["Subscriptions"] += d.subscriptions_share;
    coveredMap["Light bill"] += d.light_share;
    coveredMap["Laptop rentals"] += d.laptop_share;
    coveredMap["Miscellaneous expenses"] += d.misc_share;
    coveredMap["Marketing"] += d.marketing_amount;
    coveredMap["Profit"] += d.profit_amount;
  }

  return Object.keys(targetsMap).map(key => {
    const name = key;
    const monthly_target = roundRupees(targetsMap[key as keyof typeof targetsMap]);
    const cumulative_target = roundRupees(monthly_target * currentMonth);
    const covered_amount = roundRupees(coveredMap[key as keyof typeof coveredMap]);
    
    const remaining_gap = roundRupees(Math.max(0, cumulative_target - covered_amount));
    const surplus_amount = roundRupees(Math.max(0, covered_amount - cumulative_target));
    
    const percentage = cumulative_target > 0 
      ? Math.round((covered_amount / cumulative_target) * 100) 
      : 100;

    let status_color: "red" | "amber" | "green" | "blue" = "red";
    if (percentage > 100) status_color = "blue";
    else if (percentage >= 90) status_color = "green";
    else if (percentage >= 50) status_color = "amber";

    return {
      name,
      monthly_target,
      cumulative_target,
      covered_amount,
      remaining_gap,
      surplus_amount,
      percentage,
      status_color
    };
  });
}
