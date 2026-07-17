/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from "express";
import { db, hashPassword, createToken, verifyToken, generateUUID } from "./db";
import { 
  calculatePaymentDistribution, calculateDepartmentCosts, formatIndianCurrency, roundRupees
} from "../src/domain/finance/calculations";
import { 
  computeBankBalances, computeMarketingCardBalances, computeSalaryPool, computeCoverageTracker 
} from "./finance_engines";
import { 
  UserRole, Department, GSTType, TransferStatus, TransferType, 
  ReimbursementStatus, PayrollStatus, ArrearsStatus, DrawingType,
  CostBasis, Settings
} from "../src/types";

export const apiRouter = Router();

// Extend Request type to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
  };
}

/**
 * Middleware: Verify JWT Auth Token
 */
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Missing authorization token." });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Unauthorized. Invalid or expired token." });
  }

  req.user = decoded;
  next();
}

/**
 * Middleware: Role restriction
 */
function requireRoles(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden. Insufficient permissions." });
    }
    next();
  };
}

/**
 * Audit Log Helper
 */
function logAuditEvent(
  userId: string, 
  action: string, 
  entityType: string, 
  entityId: string, 
  fieldName?: string, 
  oldValue?: string, 
  newValue?: string,
  req?: Request
) {
  db.audit_logs.create({
    user_id: userId,
    user_name: db.users.findUnique(userId)?.full_name || "System",
    action,
    entity_type: entityType,
    entity_id: entityId,
    field_name: fieldName,
    old_value: oldValue,
    new_value: newValue,
    ip_address: req?.ip || "127.0.0.1",
    user_agent: req?.headers["user-agent"] || "Server CLI"
  });
}

// ==========================================
// 1. Authentication Routes (Section 12.1 & 14)
// ==========================================

apiRouter.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.users.findEmail(email);
  if (!user || !user.is_active) {
    return res.status(401).json({ error: "Invalid credentials or deactivated account." });
  }

  const providedHash = hashPassword(password);
  if (user.password_hash !== providedHash) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // Generate tokens
  const token = createToken({
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name
  });

  // Track login
  db.users.update(user.id, { last_login: new Date().toISOString() });
  logAuditEvent(user.id, "LOGIN", "users", user.id, "last_login", undefined, new Date().toISOString(), req);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    }
  });
});

apiRouter.get("/auth/me", requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// ==========================================
// 2. Dashboard Route (Section 12.2)
// ==========================================

apiRouter.get("/dashboard/summary", requireAuth, (req: AuthenticatedRequest, res) => {
  const payments = db.payments.findMany();
  const distributions = db.payment_distributions.findMany();
  const bankAccounts = computeBankBalances();
  const cards = computeMarketingCardBalances();
  const salaryPool = computeSalaryPool();
  const distributionTransfers = db.distribution_transfers.findMany();

  // Revenue totals
  const totalPaymentsCount = payments.length;
  const webdevRevenue = payments
    .filter(p => p.department === Department.WEB_DEV)
    .reduce((sum, p) => sum + p.payment_amount, 0);
  
  const dmRevenue = payments
    .filter(p => p.department === Department.DIGITAL_MARKETING)
    .reduce((sum, p) => sum + p.payment_amount, 0);

  // Computed allocations
  const gstLiability = distributions.reduce((sum, d) => sum + d.gst_amount, 0);
  const totalProfitAllocated = distributions.reduce((sum, d) => sum + d.profit_amount, 0);
  const marketingAllocated = distributions.reduce((sum, d) => sum + d.marketing_amount, 0);

  // Pending transfers count
  const pendingTransfers = distributionTransfers.filter(t => t.status === TransferStatus.PENDING);
  const pendingTransfersCount = pendingTransfers.length;

  // Account balances aggregates
  const bankBalanceTotal = bankAccounts.reduce((sum, a) => sum + (a.sheet_balance || 0), 0);
  const accountVarianceTotal = bankAccounts.reduce((sum, a) => sum + Math.abs(a.variance || 0), 0);

  // Dynamic monthly trend (Grouped by year-month)
  const monthlyRevenueTrend: { month: string; amount: number }[] = [];
  const groups: Record<string, number> = {};
  for (const p of payments) {
    const monthStr = p.payment_date.substring(0, 7); // YYYY-MM
    groups[monthStr] = (groups[monthStr] || 0) + p.payment_amount;
  }
  Object.keys(groups).sort().forEach(month => {
    monthlyRevenueTrend.push({ month, amount: roundRupees(groups[month]) });
  });

  res.json({
    quick_stats: {
      total_payments_count: totalPaymentsCount,
      webdev_revenue: roundRupees(webdevRevenue),
      dm_revenue: roundRupees(dmRevenue),
      gst_liability: roundRupees(gstLiability),
      available_salary_pool: salaryPool.available_pool,
      total_profit_allocated: roundRupees(totalProfitAllocated),
      marketing_allocated: roundRupees(marketingAllocated),
      pending_transfers_count: pendingTransfersCount,
      bank_balance_total: roundRupees(bankBalanceTotal),
      account_variance_total: roundRupees(accountVarianceTotal)
    },
    monthly_trend: monthlyRevenueTrend,
    bank_accounts: bankAccounts,
    marketing_cards: cards,
    recent_payments: payments.slice(-5).reverse(),
    pending_transfers: pendingTransfers.slice(0, 5)
  });
});

// ==========================================
// 3. Calculator Route (Section 12.5)
// ==========================================

apiRouter.post("/calculator/distribution", requireAuth, (req, res) => {
  const { amount, department, landed_in_account_id, gst_type } = req.body;
  if (!amount || !department || !landed_in_account_id || !gst_type) {
    return res.status(400).json({ error: "Missing required calculator parameters." });
  }

  const costBasisList = db.cost_basis.findMany();
  const settings = db.settings.findUnique();
  const accounts = db.accounts.findMany();

  try {
    const result = calculatePaymentDistribution(
      Number(amount),
      department as Department,
      landed_in_account_id,
      gst_type as GSTType,
      costBasisList,
      settings,
      accounts
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. Payments CRUD Routes (Section 4.6, 4.7, 4.8 & 12.3)
// ==========================================

apiRouter.get("/payments", requireAuth, (req, res) => {
  const payments = db.payments.findMany();
  const distributions = db.payment_distributions.findMany();
  
  // Enrich response with distributions
  const enriched = payments.map(p => {
    const dist = distributions.find(d => d.payment_id === p.id);
    return {
      ...p,
      distribution: dist
    };
  });

  res.json(enriched);
});

apiRouter.post("/payments", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { 
    department, client_name, payment_amount, landed_in_account_id, 
    gst_type, payment_date, notes, money_spent 
  } = req.body;

  if (!department || !client_name || !payment_amount || !landed_in_account_id || !gst_type || !payment_date) {
    return res.status(400).json({ error: "Missing required payment fields." });
  }

  const amountVal = Number(payment_amount);
  if (isNaN(amountVal) || amountVal <= 0) {
    return res.status(400).json({ error: "Payment amount must be a positive number." });
  }

  const accounts = db.accounts.findMany();
  const landedAccount = accounts.find(a => a.id === landed_in_account_id);
  if (!landedAccount) {
    return res.status(400).json({ error: "Invalid bank account selection." });
  }

  const costBasisList = db.cost_basis.findMany();
  const settings = db.settings.findUnique();

  // Create payment transaction
  try {
    // 1. Compute dynamic distribution
    const distResult = calculatePaymentDistribution(
      amountVal,
      department as Department,
      landed_in_account_id,
      gst_type as GSTType,
      costBasisList,
      settings,
      accounts
    );

    // Automate GST percentage by selected account
    const isCurrentAccount = landedAccount.name.toLowerCase().includes("sbi current") || 
                            landedAccount.name.toLowerCase().includes("axis current");
    const calculated_gst_pct = isCurrentAccount ? 0.18 : 0;

    // 2. Create the payment
    const payment = db.payments.create({
      department: department as Department,
      client_name,
      payment_amount: amountVal,
      landed_in_account_id,
      gst_type: gst_type as GSTType,
      gst_pct: calculated_gst_pct,
      money_spent: money_spent === true,
      payment_date,
      notes,
      created_by: req.user!.id
    });

    // 3. Create payment distribution snapshot
    const distribution = db.payment_distributions.create({
      payment_id: payment.id,
      base_amount: distResult.base_amount,
      gst_amount: distResult.gst_amount,
      salary_pool: distResult.salary_pool,
      total_salaries: distResult.total_salaries,
      rent_share: distResult.rent_share,
      car_emi_share: distResult.car_emi_share,
      subscriptions_share: distResult.subscriptions_share,
      light_share: distResult.light_share,
      laptop_share: distResult.laptop_share,
      misc_share: distResult.misc_share,
      rent_emi_total: distResult.rent_emi_total,
      subscriptions_misc_total: distResult.subscriptions_misc_total,
      total_overheads: distResult.total_overheads,
      usable_amount: distResult.usable_amount,
      marketing_amount: distResult.marketing_amount,
      profit_amount: distResult.profit_amount
    });

    // 4. Create employee shares snapshots
    const sharesPayload = distResult.employee_shares.map(share => ({
      payment_id: payment.id,
      employee_cost_basis_id: share.employee_cost_basis_id,
      employee_name_snapshot: share.employee_name_snapshot,
      monthly_salary_snapshot: share.monthly_salary_snapshot,
      allocated_amount: share.allocated_amount
    }));
    db.employee_payment_shares.createMany(sharesPayload);

    // 5. Create Distribution Transfers (Routing rules, Section 6)
    const transfersPayload: any[] = [];

    // Kotak (Rent/EMI) Transfer
    const rentEmiAmt = distResult.rent_emi_total;
    if (rentEmiAmt > 0 && landed_in_account_id !== "ba-kotak") {
      transfersPayload.push({
        payment_id: payment.id,
        transfer_type: TransferType.RENT_EMI,
        source_account_id: landed_in_account_id,
        destination_account_id: "ba-kotak",
        amount: rentEmiAmt,
        status: TransferStatus.PENDING
      });
    }

    // Axis Savings Transfer
    const subMiscAmt = distResult.subscriptions_misc_total;
    if (subMiscAmt > 0 && landed_in_account_id !== "ba-axis-savings") {
      transfersPayload.push({
        payment_id: payment.id,
        transfer_type: TransferType.SUBSCRIPTIONS_MISC,
        source_account_id: landed_in_account_id,
        destination_account_id: "ba-axis-savings",
        amount: subMiscAmt,
        status: TransferStatus.PENDING
      });
    }

    // Janseva (Profit) Transfer
    const profitAmt = distResult.profit_amount;
    if (profitAmt > 0 && landed_in_account_id !== "ba-janseva") {
      transfersPayload.push({
        payment_id: payment.id,
        transfer_type: TransferType.PROFIT,
        source_account_id: landed_in_account_id,
        destination_account_id: "ba-janseva",
        amount: profitAmt,
        status: TransferStatus.PENDING
      });
    }

    // Marketing Transfer (to marketing card unconditionally)
    const marketingAmt = distResult.marketing_amount;
    const marketingCardId = department === Department.WEB_DEV ? "mc-webdev-meta" : "mc-dm-credit";
    if (marketingAmt > 0) {
      transfersPayload.push({
        payment_id: payment.id,
        transfer_type: TransferType.MARKETING,
        source_account_id: landed_in_account_id,
        marketing_card_id: marketingCardId,
        amount: marketingAmt,
        status: TransferStatus.PENDING
      });
    }

    if (transfersPayload.length > 0) {
      db.distribution_transfers.createMany(transfersPayload);
    }

    // 6. Log audit trail
    logAuditEvent(req.user!.id, "CREATE_PAYMENT", "payments", payment.id, undefined, undefined, JSON.stringify(payment), req);

    res.json({
      success: true,
      payment,
      distribution,
      shares_count: sharesPayload.length,
      transfers_count: transfersPayload.length
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get("/payments/:id", requireAuth, (req, res) => {
  const payment = db.payments.findUnique(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: "Payment not found." });
  }

  const distribution = db.payment_distributions.findByPaymentId(payment.id);
  const employeeShares = db.employee_payment_shares.findByPaymentId(payment.id);
  const transfers = db.distribution_transfers.findByPaymentId(payment.id);

  res.json({
    ...payment,
    distribution: distribution ? { ...distribution, employee_shares: employeeShares } : undefined,
    transfers
  });
});

apiRouter.patch("/payments/:id", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { notes, money_spent } = req.body;
  const payment = db.payments.findUnique(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: "Payment not found." });
  }

  const oldSpent = payment.money_spent;
  const updated = db.payments.update(payment.id, {
    notes: notes !== undefined ? notes : payment.notes,
    money_spent: money_spent !== undefined ? money_spent === true : payment.money_spent
  });

  if (money_spent !== undefined && oldSpent !== money_spent) {
    logAuditEvent(req.user!.id, "UPDATE_PAYMENT_MONEY_SPENT", "payments", payment.id, "money_spent", String(oldSpent), String(money_spent), req);
  }

  res.json(updated);
});

apiRouter.delete("/payments/:id", requireAuth, requireRoles([UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const payment = db.payments.findUnique(req.params.id);
  if (!payment) {
    return res.status(404).json({ error: "Payment not found." });
  }

  const success = db.payments.delete(payment.id);
  if (success) {
    logAuditEvent(req.user!.id, "DELETE_PAYMENT", "payments", payment.id, undefined, JSON.stringify(payment), undefined, req);
    res.json({ success: true, message: "Payment and associated allocations deleted successfully." });
  } else {
    res.status(500).json({ error: "Failed to delete payment." });
  }
});

// ==========================================
// 5. Accounts CRUD Routes (Section 4.4 & 10)
// ==========================================

apiRouter.get("/accounts", requireAuth, (req, res) => {
  const bankAccounts = computeBankBalances();
  const marketingCards = computeMarketingCardBalances().map(c => ({
    ...c,
    sheet_balance: c.card_balance,
    type: "credit_card"
  }));
  res.json([...bankAccounts, ...marketingCards]);
});

apiRouter.get("/accounts/:id", requireAuth, (req, res) => {
  const id = req.params.id;
  let acc: any = null;
  let history: any = {
    payments: [],
    manual_transfers: [],
    distribution_transfers: [],
    reimbursements: [],
    payrolls: [],
    arrears: [],
    drawings: []
  };

  if (id.startsWith("mc-")) {
    const cards = computeMarketingCardBalances().map(c => ({
      ...c,
      sheet_balance: c.card_balance,
      type: "credit_card"
    }));
    acc = cards.find(c => c.id === id);
    if (acc) {
      history.distribution_transfers = db.distribution_transfers.findMany().filter(
        t => t.marketing_card_id === id && t.status === TransferStatus.TRANSFERRED
      );
      history.drawings = db.drawings.findMany().filter(
        d => d.marketing_card_id === id && d.drawing_type === DrawingType.MARKETING_CARD
      );
    }
  } else {
    const bankAccounts = computeBankBalances();
    acc = bankAccounts.find(a => a.id === id);
    if (acc) {
      history.payments = db.payments.findMany().filter(p => p.landed_in_account_id === id);
      history.manual_transfers = db.transfers_log.findMany().filter(t => t.from_account_id === id || t.to_account_id === id);
      history.distribution_transfers = db.distribution_transfers.findMany().filter(
        t => (t.source_account_id === id || t.destination_account_id === id) && t.status === TransferStatus.TRANSFERRED
      );
      history.reimbursements = db.reimbursement_log.findMany().filter(
        r => r.spent_from_account_id === id || r.reimbursed_by_account_id === id
      );
      history.payrolls = db.payroll_disbursement_log.findMany().filter(
        p => p.paid_from_account_id === id && p.status === PayrollStatus.PAID
      );
      history.arrears = db.salary_pool_arrears_ledger.findMany().filter(
        a => a.paid_from_account_id === id && a.status === ArrearsStatus.PAID
      );
      history.drawings = db.drawings.findMany().filter(d => d.account_id === id);
    }
  }

  if (!acc) {
    return res.status(404).json({ error: "Account not found." });
  }

  res.json({
    account: acc,
    history
  });
});

apiRouter.patch("/accounts/:id/actual-balance", requireAuth, requireRoles([UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { actual_balance } = req.body;
  if (actual_balance === undefined || isNaN(Number(actual_balance))) {
    return res.status(400).json({ error: "A valid actual balance is required." });
  }

  const id = req.params.id;
  let account: any = db.accounts.findUnique(id);
  let isCard = false;
  if (!account) {
    account = db.marketing_cards.findUnique(id);
    isCard = true;
  }

  if (!account) {
    return res.status(404).json({ error: "Account or card not found." });
  }

  const oldVal = account.actual_balance;
  const updated = isCard
    ? db.marketing_cards.updateActualBalance(account.id, Number(actual_balance))
    : db.accounts.updateActualBalance(account.id, Number(actual_balance));

  logAuditEvent(req.user!.id, "UPDATE_ACTUAL_BALANCE", "accounts", account.id, "actual_balance", String(oldVal), String(actual_balance), req);

  res.json(updated);
});

// ==========================================
// 6. Transfers Routes (Section 4.9 & 6 & 12.10)
// ==========================================

apiRouter.get("/transfers", requireAuth, (req, res) => {
  const distTransfers = db.distribution_transfers.findMany();
  const manualTransfers = db.transfers_log.findMany();
  const payments = db.payments.findMany();

  // Enrich dist transfers with client information
  const enrichedDist = distTransfers.map(t => {
    const p = payments.find(pay => pay.id === t.payment_id);
    return {
      ...t,
      payment_client_name: p ? p.client_name : "Unknown Client",
      payment_date: p ? p.payment_date : undefined
    };
  });

  res.json({
    distribution_transfers: enrichedDist,
    manual_transfers: manualTransfers
  });
});

apiRouter.post("/transfers", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { from_account_id, to_account_id, amount, purpose, reference_number, notes, date } = req.body;
  if (!from_account_id || !to_account_id || !amount || !purpose || !date) {
    return res.status(400).json({ error: "Missing required manual transfer fields." });
  }

  if (from_account_id === to_account_id) {
    return res.status(400).json({ error: "Source and destination accounts must be different." });
  }

  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: "Transfer amount must be positive." });
  }

  const accounts = db.accounts.findMany();
  const fromAcc = accounts.find(a => a.id === from_account_id);
  const toAcc = accounts.find(a => a.id === to_account_id);
  if (!fromAcc || !toAcc) {
    return res.status(400).json({ error: "Invalid account ID selection." });
  }

  const log = db.transfers_log.create({
    date,
    from_account_id,
    to_account_id,
    amount: amt,
    purpose,
    reference_number,
    notes,
    created_by: req.user!.id
  });

  logAuditEvent(req.user!.id, "MANUAL_TRANSFER", "transfers_log", log.id, undefined, undefined, JSON.stringify(log), req);

  res.json({ success: true, transfer: log });
});

apiRouter.patch("/distribution-transfers/:id/status", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { status } = req.body;
  if (!status || (status !== TransferStatus.PENDING && status !== TransferStatus.TRANSFERRED)) {
    return res.status(400).json({ error: "Invalid transfer status selection." });
  }

  const transferList = db.distribution_transfers.findMany();
  const item = transferList.find(t => t.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: "Distribution transfer item not found." });
  }

  const oldStatus = item.status;
  const updated = db.distribution_transfers.updateStatus(item.id, status as TransferStatus, req.user!.full_name);

  logAuditEvent(req.user!.id, "UPDATE_TRANSFER_STATUS", "distribution_transfers", item.id, "status", oldStatus, status, req);

  res.json(updated);
});

// ==========================================
// 7. Reimbursements Routes (Section 4.10 & 12.11)
// ==========================================

apiRouter.get("/reimbursements", requireAuth, (req, res) => {
  res.json(db.reimbursement_log.findMany());
});

apiRouter.post("/reimbursements", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { date, spent_from_account_id, amount, category_note, reimbursed_by_account_id, purpose, status } = req.body;
  if (!date || !spent_from_account_id || !amount || !category_note || !purpose) {
    return res.status(400).json({ error: "Missing required reimbursement fields." });
  }

  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: "Reimbursement amount must be positive." });
  }

  const accounts = db.accounts.findMany();
  if (!accounts.some(a => a.id === spent_from_account_id)) {
    return res.status(400).json({ error: "Invalid spending account selected." });
  }

  if (reimbursed_by_account_id && !accounts.some(a => a.id === reimbursed_by_account_id)) {
    return res.status(400).json({ error: "Invalid reimbursing account selected." });
  }

  const log = db.reimbursement_log.create({
    date,
    spent_from_account_id,
    amount: amt,
    category_note,
    reimbursed_by_account_id,
    purpose,
    status: (status || ReimbursementStatus.PENDING) as ReimbursementStatus,
    created_by: req.user!.id
  });

  logAuditEvent(req.user!.id, "CREATE_REIMBURSEMENT", "reimbursement_log", log.id, undefined, undefined, JSON.stringify(log), req);

  res.json({ success: true, reimbursement: log });
});

apiRouter.patch("/reimbursements/:id", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { status, reimbursed_by_account_id } = req.body;
  const item = db.reimbursement_log.findUnique(req.params.id);
  if (!item) {
    return res.status(404).json({ error: "Reimbursement log not found." });
  }

  const updates: Partial<any> = {};
  if (status !== undefined) {
    updates.status = status as ReimbursementStatus;
  }
  if (reimbursed_by_account_id !== undefined) {
    updates.reimbursed_by_account_id = reimbursed_by_account_id;
  }

  const updated = db.reimbursement_log.update(item.id, updates);
  logAuditEvent(req.user!.id, "UPDATE_REIMBURSEMENT", "reimbursement_log", item.id, "status", item.status, status, req);

  res.json(updated);
});

// ==========================================
// 8. Payroll Routes (Section 4.11 & 12.12)
// ==========================================

apiRouter.get("/payroll", requireAuth, (req, res) => {
  res.json(db.payroll_disbursement_log.findMany());
});

apiRouter.post("/payroll", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { employee_name, employee_cost_basis_id, amount, scheduled_date, notes } = req.body;
  if (!employee_name || !employee_cost_basis_id || !amount || !scheduled_date) {
    return res.status(400).json({ error: "Missing required payroll fields." });
  }

  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: "Payroll amount must be positive." });
  }

  const log = db.payroll_disbursement_log.create({
    employee_name,
    employee_cost_basis_id,
    amount: amt,
    status: PayrollStatus.PENDING,
    scheduled_date,
    created_by: req.user!.id,
    notes
  });

  logAuditEvent(req.user!.id, "CREATE_PAYROLL", "payroll_disbursement_log", log.id, undefined, undefined, JSON.stringify(log), req);

  res.json({ success: true, payroll: log });
});

apiRouter.patch("/payroll/:id/status", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { status, paid_from_account_id } = req.body;
  if (!status || (status !== PayrollStatus.PENDING && status !== PayrollStatus.PAID)) {
    return res.status(400).json({ error: "Invalid payroll status selected." });
  }

  const item = db.payroll_disbursement_log.findUnique(req.params.id);
  if (!item) {
    return res.status(404).json({ error: "Payroll entry not found." });
  }

  if (status === PayrollStatus.PAID && !paid_from_account_id) {
    return res.status(400).json({ error: "A paid_from_account_id is required to mark payroll as PAID." });
  }

  const oldStatus = item.status;
  const updated = db.payroll_disbursement_log.update(item.id, {
    status: status as PayrollStatus,
    paid_from_account_id: paid_from_account_id || item.paid_from_account_id,
    paid_date: status === PayrollStatus.PAID ? new Date().toISOString() : undefined
  });

  logAuditEvent(req.user!.id, "UPDATE_PAYROLL_STATUS", "payroll_disbursement_log", item.id, "status", oldStatus, status, req);

  res.json(updated);
});

// ==========================================
// 9. Salary Pool / Arrears Routes (Section 4.12, 4.13 & 9 & 12.9)
// ==========================================

apiRouter.get("/salary-pool", requireAuth, (req, res) => {
  const summary = computeSalaryPool();
  const arrears = db.salary_pool_arrears_ledger.findMany();
  const personOwed = db.salary_pool_person_owed.findMany();
  
  res.json({
    summary,
    arrears,
    person_owed: personOwed
  });
});

apiRouter.post("/salary-pool/person-owed", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { employee_name, employee_cost_basis_id, amount_owed, note } = req.body;
  if (!employee_name || !employee_cost_basis_id || amount_owed === undefined) {
    return res.status(400).json({ error: "Missing required arrears outstanding fields." });
  }

  // Check if person owed record already exists
  const existing = db.salary_pool_person_owed.findByEmployeeId(employee_cost_basis_id);
  let result;
  if (existing) {
    result = db.salary_pool_person_owed.update(existing.id, Number(amount_owed), note || existing.note);
    logAuditEvent(req.user!.id, "UPDATE_ARREARS_OWED", "salary_pool_person_owed", existing.id, "amount_owed", String(existing.amount_owed), String(amount_owed), req);
  } else {
    result = db.salary_pool_person_owed.create({
      employee_name,
      employee_cost_basis_id,
      amount_owed: Number(amount_owed),
      note
    });
    logAuditEvent(req.user!.id, "CREATE_ARREARS_OWED", "salary_pool_person_owed", result.id, undefined, undefined, JSON.stringify(result), req);
  }

  res.json({ success: true, entry: result });
});

apiRouter.post("/salary-pool/arrears", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { employee_name, employee_cost_basis_id, amount_owed, entry_date, note } = req.body;
  if (!employee_name || !employee_cost_basis_id || !amount_owed || !entry_date) {
    return res.status(400).json({ error: "Missing required arrears entry fields." });
  }

  const log = db.salary_pool_arrears_ledger.create({
    employee_name,
    employee_cost_basis_id,
    amount_owed: Number(amount_owed),
    status: ArrearsStatus.PENDING,
    entry_date,
    note,
    created_by: req.user!.id
  });

  logAuditEvent(req.user!.id, "CREATE_ARREARS_LEDGER_ENTRY", "salary_pool_arrears_ledger", log.id, undefined, undefined, JSON.stringify(log), req);

  res.json({ success: true, arrears: log });
});

apiRouter.patch("/salary-pool/arrears/:id/status", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { status, paid_from_account_id } = req.body;
  if (!status || (status !== ArrearsStatus.PENDING && status !== ArrearsStatus.PAID)) {
    return res.status(400).json({ error: "Invalid status value selection." });
  }

  const item = db.salary_pool_arrears_ledger.findUnique(req.params.id);
  if (!item) {
    return res.status(404).json({ error: "Arrears ledger item not found." });
  }

  if (status === ArrearsStatus.PAID && !paid_from_account_id) {
    return res.status(400).json({ error: "A paid_from_account_id is required to pay arrears." });
  }

  const oldStatus = item.status;
  const updated = db.salary_pool_arrears_ledger.update(item.id, {
    status: status as ArrearsStatus,
    paid_from_account_id: paid_from_account_id || item.paid_from_account_id,
    date_paid: status === ArrearsStatus.PAID ? new Date().toISOString() : undefined
  });

  logAuditEvent(req.user!.id, "UPDATE_ARREARS_STATUS", "salary_pool_arrears_ledger", item.id, "status", oldStatus, status, req);

  res.json(updated);
});

// ==========================================
// 10. Cost Basis Page CRUD Routes (Section 4.2 & 12.13)
// ==========================================

apiRouter.get("/cost-basis", requireAuth, (req, res) => {
  res.json(db.cost_basis.findMany());
});

apiRouter.post("/cost-basis", requireAuth, requireRoles([UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { category, name, monthly_amount, is_active } = req.body;
  if (!category || !name || monthly_amount === undefined) {
    return res.status(400).json({ error: "Missing required cost basis fields." });
  }

  const cost = db.cost_basis.create({
    category,
    name,
    monthly_amount: Number(monthly_amount),
    is_active: is_active !== false
  });

  logAuditEvent(req.user!.id, "CREATE_COST_BASIS", "cost_basis", cost.id, undefined, undefined, JSON.stringify(cost), req);

  res.json({ success: true, cost_basis: cost });
});

apiRouter.patch("/cost-basis/:id", requireAuth, requireRoles([UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { name, monthly_amount, is_active } = req.body;
  const cost = db.cost_basis.findUnique(req.params.id);
  if (!cost) {
    return res.status(404).json({ error: "Cost basis entry not found." });
  }

  const updates: Partial<CostBasis> = {};
  if (name !== undefined) updates.name = name;
  if (monthly_amount !== undefined) updates.monthly_amount = Number(monthly_amount);
  if (is_active !== undefined) updates.is_active = is_active === true;

  const updated = db.cost_basis.update(cost.id, updates);
  logAuditEvent(req.user!.id, "UPDATE_COST_BASIS", "cost_basis", cost.id, "fields", JSON.stringify(cost), JSON.stringify(updated), req);

  res.json(updated);
});

// ==========================================
// 11. Settings Routes (Section 4.3 & 12.14)
// ==========================================

apiRouter.get("/settings", requireAuth, (req, res) => {
  res.json(db.settings.findUnique());
});

apiRouter.patch("/settings", requireAuth, requireRoles([UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { 
    target_profit_margin, marketing_cap_pct, current_month_number, 
    webdev_marketing_budget, dm_marketing_budget 
  } = req.body;

  const current = db.settings.findUnique();
  const updates: Partial<Settings> = {};

  if (target_profit_margin !== undefined) updates.target_profit_margin = Number(target_profit_margin);
  if (marketing_cap_pct !== undefined) updates.marketing_cap_pct = Number(marketing_cap_pct);
  if (current_month_number !== undefined) updates.current_month_number = Number(current_month_number);
  if (webdev_marketing_budget !== undefined) updates.webdev_marketing_budget = Number(webdev_marketing_budget);
  if (dm_marketing_budget !== undefined) updates.dm_marketing_budget = Number(dm_marketing_budget);

  const updated = db.settings.update(updates);
  logAuditEvent(req.user!.id, "UPDATE_SETTINGS", "settings", current.id, "values", JSON.stringify(current), JSON.stringify(updated), req);

  res.json(updated);
});

// ==========================================
// 12. Drawings Route (Section 4.14)
// ==========================================

apiRouter.get("/drawings", requireAuth, (req, res) => {
  res.json(db.drawings.findMany());
});

apiRouter.post("/drawings", requireAuth, requireRoles([UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { account_id, marketing_card_id, drawing_type, amount, drawing_date, category, purpose, notes } = req.body;
  if (!drawing_type || !amount || !drawing_date || !category || !purpose) {
    return res.status(400).json({ error: "Missing required drawings logging parameters." });
  }

  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: "Drawing amount must be positive." });
  }

  const log = db.drawings.create({
    drawing_type: drawing_type as DrawingType,
    amount: amt,
    drawing_date,
    category,
    purpose,
    account_id: drawing_type === DrawingType.BANK_ACCOUNT ? account_id : undefined,
    marketing_card_id: drawing_type === DrawingType.MARKETING_CARD ? marketing_card_id : undefined,
    notes,
    created_by: req.user!.id
  });

  logAuditEvent(req.user!.id, "CREATE_DRAWINGS", "drawings", log.id, undefined, undefined, JSON.stringify(log), req);

  res.json({ success: true, drawing: log });
});

// ==========================================
// 13. Audit Logs Route (Section 4.15)
// ==========================================

apiRouter.get("/audit-logs", requireAuth, requireRoles([UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req, res) => {
  res.json(db.audit_logs.findMany().reverse());
});

// ==========================================
// 14. Reports Router (Section 12.15)
// ==========================================

apiRouter.get("/reports/:reportType", requireAuth, requireRoles([UserRole.FINANCE_HEAD, UserRole.ADMIN]), (req, res) => {
  const { reportType } = req.params;
  const payments = db.payments.findMany();
  const distributions = db.payment_distributions.findMany();
  const bankAccounts = computeBankBalances();
  const mcCards = computeMarketingCardBalances();
  const pool = computeSalaryPool();
  const auditLogs = db.audit_logs.findMany();

  let reportData: any = {};

  switch (reportType) {
    case "monthly-revenue":
      reportData = payments.map(p => ({
        date: p.payment_date,
        client: p.client_name,
        department: p.department,
        amount: p.payment_amount
      }));
      break;

    case "gst-liability":
      reportData = enrichedPaymentsReport(payments, distributions);
      break;

    case "coverage":
      reportData = {
        webdev: computeCoverageTracker(Department.WEB_DEV, db.settings.findUnique().current_month_number),
        digital_marketing: computeCoverageTracker(Department.DIGITAL_MARKETING, db.settings.findUnique().current_month_number)
      };
      break;

    case "account-reconciliation":
      reportData = bankAccounts.map(b => ({
        name: b.name,
        opening: b.opening_balance,
        computed: b.sheet_balance,
        actual: b.actual_balance,
        variance: b.variance
      }));
      break;

    case "salary-pool":
      reportData = {
        summary: pool,
        arrears: db.salary_pool_arrears_ledger.findMany()
      };
      break;

    case "audit":
      reportData = auditLogs.reverse().slice(0, 100);
      break;

    default:
      return res.status(400).json({ error: "Unknown report category requested." });
  }

  res.json({
    report_type: reportType,
    generated_at: new Date().toISOString(),
    data: reportData
  });
});

function enrichedPaymentsReport(payments: any[], distributions: any[]) {
  return payments.map(p => {
    const d = distributions.find(dist => dist.payment_id === p.id);
    return {
      date: p.payment_date,
      client: p.client_name,
      total_amount: p.payment_amount,
      base_amount: d?.base_amount || 0,
      gst_amount: d?.gst_amount || 0,
      salary_allocated: d?.salary_pool || 0,
      profit_allocated: d?.profit_amount || 0,
      marketing_allocated: d?.marketing_amount || 0
    };
  });
}

// ==========================================
// 15. Historical Migration Route (Section 13)
// ==========================================

apiRouter.post("/migration/import", requireAuth, requireRoles([UserRole.ADMIN]), (req: AuthenticatedRequest, res) => {
  const { import_type, file_name, rows } = req.body;
  if (!import_type || !file_name || !rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: "Invalid import parameters." });
  }

  const accounts = db.accounts.findMany();
  const costBasisList = db.cost_basis.findMany();
  const settings = db.settings.findUnique();

  const importedPayments: any[] = [];
  
  try {
    // Process records in a simulated local db transaction
    const batch = db.import_batches.create({
      import_type,
      file_name,
      row_count: rows.length,
      created_by: req.user!.id
    });

    for (const row of rows) {
      // Row fields expected: department, client_name, payment_amount, landed_in_account_id, gst_type, payment_date, money_spent
      const department = row.department === "web_dev" ? Department.WEB_DEV : Department.DIGITAL_MARKETING;
      const client_name = row.client_name || "Migration Client";
      const payment_amount = Number(row.payment_amount);
      const landed_in_account_id = row.landed_in_account_id || "ba-sbi-current";
      const gst_type = row.gst_type === "exclusive" ? GSTType.EXCLUSIVE : GSTType.INCLUSIVE;
      const payment_date = row.payment_date || new Date().toISOString().split("T")[0];
      const money_spent = row.money_spent === true;

      // Calculate distributions using snapshot matching
      const distResult = calculatePaymentDistribution(
        payment_amount,
        department,
        landed_in_account_id,
        gst_type,
        costBasisList,
        settings,
        accounts
      );

      // Determine GST rate
      const landedAccount = accounts.find(a => a.id === landed_in_account_id);
      const accountName = landedAccount ? landedAccount.name.toLowerCase() : "";
      const calculated_gst_pct = (accountName.includes("sbi current") || accountName.includes("axis current")) ? 0.18 : 0;

      // Write Payment
      const payment = db.payments.create({
        department,
        client_name,
        payment_amount,
        landed_in_account_id,
        gst_type,
        gst_pct: calculated_gst_pct,
        money_spent,
        payment_date,
        created_by: req.user!.id
      });

      // Write snapshots
      db.payment_distributions.create({
        payment_id: payment.id,
        base_amount: distResult.base_amount,
        gst_amount: distResult.gst_amount,
        salary_pool: distResult.salary_pool,
        total_salaries: distResult.total_salaries,
        rent_share: distResult.rent_share,
        car_emi_share: distResult.car_emi_share,
        subscriptions_share: distResult.subscriptions_share,
        light_share: distResult.light_share,
        laptop_share: distResult.laptop_share,
        misc_share: distResult.misc_share,
        rent_emi_total: distResult.rent_emi_total,
        subscriptions_misc_total: distResult.subscriptions_misc_total,
        total_overheads: distResult.total_overheads,
        usable_amount: distResult.usable_amount,
        marketing_amount: distResult.marketing_amount,
        profit_amount: distResult.profit_amount
      });

      const sharesPayload = distResult.employee_shares.map(share => ({
        payment_id: payment.id,
        employee_cost_basis_id: share.employee_cost_basis_id,
        employee_name_snapshot: share.employee_name_snapshot,
        monthly_salary_snapshot: share.monthly_salary_snapshot,
        allocated_amount: share.allocated_amount
      }));
      db.employee_payment_shares.createMany(sharesPayload);

      // Create Pending distribution transfers
      const transfersPayload: any[] = [];
      if (distResult.rent_emi_total > 0 && landed_in_account_id !== "ba-kotak") {
        transfersPayload.push({
          payment_id: payment.id,
          transfer_type: TransferType.RENT_EMI,
          source_account_id: landed_in_account_id,
          destination_account_id: "ba-kotak",
          amount: distResult.rent_emi_total,
          status: TransferStatus.PENDING
        });
      }
      if (distResult.subscriptions_misc_total > 0 && landed_in_account_id !== "ba-axis-savings") {
        transfersPayload.push({
          payment_id: payment.id,
          transfer_type: TransferType.SUBSCRIPTIONS_MISC,
          source_account_id: landed_in_account_id,
          destination_account_id: "ba-axis-savings",
          amount: distResult.subscriptions_misc_total,
          status: TransferStatus.PENDING
        });
      }
      if (distResult.profit_amount > 0 && landed_in_account_id !== "ba-janseva") {
        transfersPayload.push({
          payment_id: payment.id,
          transfer_type: TransferType.PROFIT,
          source_account_id: landed_in_account_id,
          destination_account_id: "ba-janseva",
          amount: distResult.profit_amount,
          status: TransferStatus.PENDING
        });
      }
      const marketingCardId = department === Department.WEB_DEV ? "mc-webdev-meta" : "mc-dm-credit";
      if (distResult.marketing_amount > 0) {
        transfersPayload.push({
          payment_id: payment.id,
          transfer_type: TransferType.MARKETING,
          source_account_id: landed_in_account_id,
          marketing_card_id: marketingCardId,
          amount: distResult.marketing_amount,
          status: TransferStatus.PENDING
        });
      }

      if (transfersPayload.length > 0) {
        db.distribution_transfers.createMany(transfersPayload);
      }

      importedPayments.push(payment);
    }

    logAuditEvent(req.user!.id, "IMPORT_BATCH_SUCCESS", "import_batches", batch.id, undefined, undefined, JSON.stringify(batch), req);

    res.json({
      success: true,
      batch_id: batch.id,
      count: importedPayments.length
    });

  } catch (err: any) {
    res.status(500).json({ error: `Import failed: ${err.message}` });
  }
});
