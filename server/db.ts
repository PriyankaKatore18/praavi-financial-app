/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import pg from "pg";
import {
  User, UserRole, CostBasis, CostCategory, Settings,
  Account, AccountType, MarketingCard, Payment,
  PaymentDistribution, EmployeePaymentShare, DistributionTransfer,
  TransferLog, ReimbursementLog, PayrollDisbursementLog,
  SalaryPoolArrearsLedger, SalaryPoolPersonOwed, Drawing,
  AuditLog, ImportBatch, TransferStatus
} from "../src/types";

// Database storage file path
const DB_FILE = path.join(process.cwd(), "db.json");

// JWT secret key (auto-generated once if not exists)
let JWT_SECRET = process.env.JWT_SECRET || "praavi_secret_key_1234_secure";

export interface DatabaseSchema {
  users: User[];
  cost_basis: CostBasis[];
  settings: Settings[];
  accounts: Account[];
  marketing_cards: MarketingCard[];
  payments: Payment[];
  payment_distributions: PaymentDistribution[];
  employee_payment_shares: EmployeePaymentShare[];
  distribution_transfers: DistributionTransfer[];
  transfers_log: TransferLog[];
  reimbursement_log: ReimbursementLog[];
  payroll_disbursement_log: PayrollDisbursementLog[];
  salary_pool_arrears_ledger: SalaryPoolArrearsLedger[];
  salary_pool_person_owed: SalaryPoolPersonOwed[];
  drawings: Drawing[];
  audit_logs: AuditLog[];
  import_batches: ImportBatch[];
}

function createClientReadyState(timestamp = new Date().toISOString()): DatabaseSchema {
  const makeUser = (id: string, full_name: string, email: string, password: string, role: UserRole): User => ({
    id,
    full_name,
    email,
    password_hash: hashPassword(password),
    role,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp
  });

  const makeCostBasis = (id: string, category: CostCategory, name: string): CostBasis => ({
    id,
    category,
    name,
    monthly_amount: 0,
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp
  });

  const costBasis: CostBasis[] = [
    makeCostBasis("cb-prajakta", CostCategory.TEAM_WEBDEV, "Web Dev Employee 1"),
    makeCostBasis("cb-abhi", CostCategory.TEAM_WEBDEV, "Web Dev Employee 2"),
    makeCostBasis("cb-vaishnavee-web", CostCategory.TEAM_WEBDEV, "Web Dev Employee 3"),
    makeCostBasis("cb-bhushan", CostCategory.TEAM_WEBDEV, "Web Dev Employee 4"),
    makeCostBasis("cb-vipin", CostCategory.TEAM_WEBDEV, "Web Dev Employee 5"),
    makeCostBasis("cb-priyanka", CostCategory.TEAM_WEBDEV, "Web Dev Employee 6"),
    makeCostBasis("cb-shreyas", CostCategory.TEAM_DM, "Digital Marketing Employee 1"),
    makeCostBasis("cb-prathamesh", CostCategory.TEAM_DM, "Digital Marketing Employee 2"),
    makeCostBasis("cb-shradhha", CostCategory.TEAM_DM, "Digital Marketing Employee 3"),
    makeCostBasis("cb-ayush", CostCategory.TEAM_DM, "Digital Marketing Employee 4"),
    makeCostBasis("cb-vaishnavee-k", CostCategory.TEAM_DM, "Digital Marketing Employee 5"),
    makeCostBasis("cb-pratik", CostCategory.TEAM_DM, "Digital Marketing Employee 6"),
    makeCostBasis("cb-amrut", CostCategory.TEAM_DM, "Digital Marketing Employee 7"),
    makeCostBasis("cb-sumedh", CostCategory.TEAM_DM, "Digital Marketing Employee 8"),
    makeCostBasis("cb-pooja", CostCategory.MANAGEMENT, "Management 1"),
    makeCostBasis("cb-malhar", CostCategory.MANAGEMENT, "Management 2"),
    makeCostBasis("cb-vishal", CostCategory.MANAGEMENT, "Management 3"),
    makeCostBasis("cb-aryan", CostCategory.MANAGEMENT, "Management 4"),
    makeCostBasis("cb-tanuja", CostCategory.MANAGEMENT, "Management 5"),
    makeCostBasis("cb-sakshi", CostCategory.MANAGEMENT, "Management 6"),
    makeCostBasis("cb-rent", CostCategory.OVERHEAD, "Rent"),
    makeCostBasis("cb-car-emi", CostCategory.OVERHEAD, "Car EMI"),
    makeCostBasis("cb-subscriptions", CostCategory.OVERHEAD, "Subscriptions"),
    makeCostBasis("cb-light-bill", CostCategory.OVERHEAD, "Light bill"),
    makeCostBasis("cb-laptop-rentals", CostCategory.OVERHEAD, "Laptop rentals"),
    makeCostBasis("cb-misc", CostCategory.OVERHEAD, "Misc")
  ];

  return {
    users: [
      makeUser("u-admin", "Administrator", "admin@praavi.com", "admin123", UserRole.ADMIN),
      makeUser("u-head", "Finance Head", "head@praavi.com", "head123", UserRole.FINANCE_HEAD),
      makeUser("u-accountant", "Accountant", "accountant@praavi.com", "accountant123", UserRole.ACCOUNTANT)
    ],
    cost_basis: costBasis,
    settings: [
      {
        id: "settings-global",
        target_profit_margin: 0,
        marketing_cap_pct: 0,
        current_month_number: 0,
        webdev_marketing_budget: 0,
        dm_marketing_budget: 0,
        financial_year_start_month: 4,
        currency_code: "INR",
        created_at: timestamp,
        updated_at: timestamp
      }
    ],
    accounts: [
      {
        id: "ba-sbi-current",
        name: "Primary Current Account",
        account_type: AccountType.BANK,
        opening_balance: 0,
        actual_balance: 0,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp
      },
      {
        id: "ba-axis-current",
        name: "Secondary Current Account",
        account_type: AccountType.BANK,
        opening_balance: 0,
        actual_balance: 0,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp
      },
      {
        id: "ba-boi-savings",
        name: "Owner Savings Account",
        account_type: AccountType.BANK,
        opening_balance: 0,
        actual_balance: 0,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp
      },
      {
        id: "ba-kotak",
        name: "Rent & EMI Account",
        account_type: AccountType.BANK,
        opening_balance: 0,
        actual_balance: 0,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp
      },
      {
        id: "ba-janseva",
        name: "Profit Reserve Account",
        account_type: AccountType.BANK,
        opening_balance: 0,
        actual_balance: 0,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp
      },
      {
        id: "ba-axis-savings",
        name: "Expense Savings Account",
        account_type: AccountType.BANK,
        opening_balance: 0,
        actual_balance: 0,
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp
      }
    ],
    marketing_cards: [
      {
        id: "mc-webdev-meta",
        name: "Web Development Marketing Card",
        department: "web_dev",
        opening_balance: 0,
        actual_balance: 0,
        created_at: timestamp,
        updated_at: timestamp
      },
      {
        id: "mc-dm-credit",
        name: "Digital Marketing Card",
        department: "digital_marketing",
        opening_balance: 0,
        actual_balance: 0,
        created_at: timestamp,
        updated_at: timestamp
      }
    ],
    payments: [],
    payment_distributions: [],
    employee_payment_shares: [],
    distribution_transfers: [],
    transfers_log: [],
    reimbursement_log: [],
    payroll_disbursement_log: [],
    salary_pool_arrears_ledger: [],
    salary_pool_person_owed: costBasis
      .filter(item => item.category !== CostCategory.OVERHEAD)
      .map(item => ({
        id: `spo-${item.id}`,
        employee_name: item.name,
        employee_cost_basis_id: item.id,
        amount_owed: 0,
        note: "Set this only if your client has pending salary arrears.",
        created_at: timestamp,
        updated_at: timestamp
      })),
    drawings: [],
    audit_logs: [],
    import_batches: []
  };
}

// Global in-memory instance
let dbData: DatabaseSchema = {
  users: [],
  cost_basis: [],
  settings: [],
  accounts: [],
  marketing_cards: [],
  payments: [],
  payment_distributions: [],
  employee_payment_shares: [],
  distribution_transfers: [],
  transfers_log: [],
  reimbursement_log: [],
  payroll_disbursement_log: [],
  salary_pool_arrears_ledger: [],
  salary_pool_person_owed: [],
  drawings: [],
  audit_logs: [],
  import_batches: []
};

/**
 * Hash a password using PBKDF2 (native Node.js, 100% reliable)
 */
export function hashPassword(password: string, salt = "praavi_salt"): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

/**
 * Generate a random UUID
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Seed initial system data if database file is empty or new
 */
function seedDatabase() {
  const seed = createClientReadyState();

  if (dbData.users.length === 0) dbData.users = seed.users;
  if (dbData.settings.length === 0) dbData.settings = seed.settings;
  if (dbData.accounts.length === 0) dbData.accounts = seed.accounts;
  if (dbData.marketing_cards.length === 0) dbData.marketing_cards = seed.marketing_cards;
  if (dbData.cost_basis.length === 0) dbData.cost_basis = seed.cost_basis;
  if (dbData.salary_pool_person_owed.length === 0) dbData.salary_pool_person_owed = seed.salary_pool_person_owed;
}

/**
 * Setup Supabase Postgres database pool
 */
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

const pool = SUPABASE_DB_URL ? new pg.Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false
  }
}) : null;

/**
 * Initialize Supabase Postgres and load database state
 */
export async function initSupabaseDb() {
  if (!SUPABASE_DB_URL || !pool) {
    console.log("SUPABASE_DB_URL is not set. Falling back to local db.json persistence...");
    seedDatabase();
    return;
  }

  try {
    console.log("Connecting to Supabase PostgreSQL Database...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS praavi_state (
        id INT PRIMARY KEY,
        state_json JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const res = await pool.query("SELECT state_json FROM praavi_state WHERE id = 1");
    if (res.rows.length > 0) {
      console.log("Database state successfully loaded from Supabase PostgreSQL!");
      dbData = res.rows[0].state_json;
      fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf-8");
    } else {
      console.log("No existing state found in Supabase. Initializing default state...");
      seedDatabase();
      await pool.query(
        "INSERT INTO praavi_state (id, state_json) VALUES (1, $1)",
        [dbData]
      );
      console.log("Default state seeded and saved to Supabase PostgreSQL!");
    }
  } catch (err) {
    console.error("Error initializing Supabase Database:", err);
    console.log("Falling back to local db.json persistence...");
    if (fs.existsSync(DB_FILE)) {
      try {
        const data = fs.readFileSync(DB_FILE, "utf-8");
        dbData = JSON.parse(data);
        console.log("Successfully loaded database from local fallback db.json");
      } catch (fileErr) {
        console.error("Error reading fallback local db.json:", fileErr);
      }
    }
    seedDatabase();
  }
}

/**
 * Load database from db.json file initially
 */
export function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      dbData = JSON.parse(data);
    }
    seedDatabase();
    if (!SUPABASE_DB_URL) {
      saveDb();
    }
  } catch (err) {
    console.error("Error loading database:", err);
    seedDatabase();
  }
}

/**
 * Save database back to db.json file and to Supabase
 */
export function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf-8");

    if (pool) {
      pool.query(
        "INSERT INTO praavi_state (id, state_json, updated_at) VALUES (1, $1, NOW()) ON CONFLICT (id) DO UPDATE SET state_json = EXCLUDED.state_json, updated_at = NOW()",
        [dbData]
      ).catch(err => {
        console.error("Failed to save state to Supabase PostgreSQL:", err);
      });
    }
  } catch (err) {
    console.error("Error saving database:", err);
  }
}

export function getDbSnapshot(): DatabaseSchema {
  return JSON.parse(JSON.stringify(dbData));
}

export function resetDbToSeedState(): DatabaseSchema {
  dbData = createClientReadyState();
  saveDb();
  return getDbSnapshot();
}

// Immediately load DB from local json on initialization
loadDb();

/**
 * Direct access wrapper mimicking relational schema operations.
 */
export const db = {
  users: {
    findMany: () => dbData.users,
    findUnique: (id: string) => dbData.users.find(u => u.id === id),
    findEmail: (email: string) => dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase()),
    create: (user: Omit<User, "id" | "created_at" | "updated_at">) => {
      const newUser: User = {
        ...user,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dbData.users.push(newUser);
      saveDb();
      return newUser;
    },
    update: (id: string, updates: Partial<User>) => {
      const index = dbData.users.findIndex(u => u.id === id);
      if (index === -1) return null;
      dbData.users[index] = {
        ...dbData.users[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      saveDb();
      return dbData.users[index];
    }
  },

  cost_basis: {
    findMany: () => dbData.cost_basis,
    findUnique: (id: string) => dbData.cost_basis.find(c => c.id === id),
    create: (cost: Omit<CostBasis, "id" | "created_at" | "updated_at">) => {
      const newCost: CostBasis = {
        ...cost,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dbData.cost_basis.push(newCost);
      saveDb();
      return newCost;
    },
    update: (id: string, updates: Partial<CostBasis>) => {
      const index = dbData.cost_basis.findIndex(c => c.id === id);
      if (index === -1) return null;
      dbData.cost_basis[index] = {
        ...dbData.cost_basis[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      saveDb();
      return dbData.cost_basis[index];
    },
    delete: (id: string) => {
      const index = dbData.cost_basis.findIndex(c => c.id === id);
      if (index === -1) return false;
      dbData.cost_basis[index].is_active = false;
      dbData.cost_basis[index].updated_at = new Date().toISOString();
      saveDb();
      return true;
    }
  },

  settings: {
    findUnique: () => dbData.settings[0],
    update: (updates: Partial<Settings>) => {
      const index = 0;
      dbData.settings[index] = {
        ...dbData.settings[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      saveDb();
      return dbData.settings[index];
    }
  },

  accounts: {
    findMany: () => dbData.accounts,
    findUnique: (id: string) => dbData.accounts.find(a => a.id === id),
    updateActualBalance: (id: string, actual_balance: number) => {
      const index = dbData.accounts.findIndex(a => a.id === id);
      if (index === -1) return null;
      dbData.accounts[index] = {
        ...dbData.accounts[index],
        actual_balance,
        updated_at: new Date().toISOString()
      };
      saveDb();
      return dbData.accounts[index];
    }
  },

  marketing_cards: {
    findMany: () => dbData.marketing_cards,
    findUnique: (id: string) => dbData.marketing_cards.find(m => m.id === id),
    updateActualBalance: (id: string, actual_balance: number) => {
      const index = dbData.marketing_cards.findIndex(m => m.id === id);
      if (index === -1) return null;
      dbData.marketing_cards[index] = {
        ...dbData.marketing_cards[index],
        actual_balance,
        updated_at: new Date().toISOString()
      };
      saveDb();
      return dbData.marketing_cards[index];
    }
  },

  payments: {
    findMany: () => dbData.payments,
    findUnique: (id: string) => dbData.payments.find(p => p.id === id),
    create: (payment: Omit<Payment, "id" | "created_at" | "updated_at">) => {
      const newPayment: Payment = {
        ...payment,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dbData.payments.push(newPayment);
      saveDb();
      return newPayment;
    },
    update: (id: string, updates: Partial<Payment>) => {
      const index = dbData.payments.findIndex(p => p.id === id);
      if (index === -1) return null;
      dbData.payments[index] = {
        ...dbData.payments[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      saveDb();
      return dbData.payments[index];
    },
    delete: (id: string) => {
      const initialLength = dbData.payments.length;
      dbData.payments = dbData.payments.filter(p => p.id !== id);
      dbData.payment_distributions = dbData.payment_distributions.filter(d => d.payment_id !== id);
      dbData.employee_payment_shares = dbData.employee_payment_shares.filter(s => s.payment_id !== id);
      dbData.distribution_transfers = dbData.distribution_transfers.filter(t => t.payment_id !== id);
      saveDb();
      return dbData.payments.length < initialLength;
    }
  },

  payment_distributions: {
    findMany: () => dbData.payment_distributions,
    findByPaymentId: (paymentId: string) => dbData.payment_distributions.find(d => d.payment_id === paymentId),
    create: (dist: Omit<PaymentDistribution, "id" | "created_at">) => {
      const newDist: PaymentDistribution = {
        ...dist,
        id: generateUUID(),
        created_at: new Date().toISOString()
      };
      dbData.payment_distributions.push(newDist);
      saveDb();
      return newDist;
    }
  },

  employee_payment_shares: {
    findMany: () => dbData.employee_payment_shares,
    findByPaymentId: (paymentId: string) => dbData.employee_payment_shares.filter(s => s.payment_id === paymentId),
    createMany: (shares: Omit<EmployeePaymentShare, "id" | "created_at">[]) => {
      const newShares = shares.map(s => ({
        ...s,
        id: generateUUID(),
        created_at: new Date().toISOString()
      }));
      dbData.employee_payment_shares.push(...newShares);
      saveDb();
      return newShares;
    }
  },

  distribution_transfers: {
    findMany: () => dbData.distribution_transfers,
    findByPaymentId: (paymentId: string) => dbData.distribution_transfers.filter(t => t.payment_id === paymentId),
    createMany: (transfers: Omit<DistributionTransfer, "id" | "created_at" | "updated_at">[]) => {
      const newTransfers = transfers.map(t => ({
        ...t,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      dbData.distribution_transfers.push(...newTransfers);
      saveDb();
      return newTransfers;
    },
    updateStatus: (id: string, status: TransferStatus, userName: string) => {
      const index = dbData.distribution_transfers.findIndex(t => t.id === id);
      if (index === -1) return null;
      dbData.distribution_transfers[index] = {
        ...dbData.distribution_transfers[index],
        status,
        transferred_by: userName,
        transferred_at: status === TransferStatus.TRANSFERRED ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      };
      saveDb();
      return dbData.distribution_transfers[index];
    }
  },

  transfers_log: {
    findMany: () => dbData.transfers_log,
    create: (log: Omit<TransferLog, "id" | "created_at" | "updated_at">) => {
      const newLog: TransferLog = {
        ...log,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dbData.transfers_log.push(newLog);
      saveDb();
      return newLog;
    }
  },

  reimbursement_log: {
    findMany: () => dbData.reimbursement_log,
    findUnique: (id: string) => dbData.reimbursement_log.find(r => r.id === id),
    create: (log: Omit<ReimbursementLog, "id" | "created_at" | "updated_at">) => {
      const newLog: ReimbursementLog = {
        ...log,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dbData.reimbursement_log.push(newLog);
      saveDb();
      return newLog;
    },
    update: (id: string, updates: Partial<ReimbursementLog>) => {
      const index = dbData.reimbursement_log.findIndex(r => r.id === id);
      if (index === -1) return null;
      dbData.reimbursement_log[index] = {
        ...dbData.reimbursement_log[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      saveDb();
      return dbData.reimbursement_log[index];
    }
  },

  payroll_disbursement_log: {
    findMany: () => dbData.payroll_disbursement_log,
    findUnique: (id: string) => dbData.payroll_disbursement_log.find(p => p.id === id),
    create: (log: Omit<PayrollDisbursementLog, "id" | "created_at" | "updated_at">) => {
      const newLog: PayrollDisbursementLog = {
        ...log,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dbData.payroll_disbursement_log.push(newLog);
      saveDb();
      return newLog;
    },
    update: (id: string, updates: Partial<PayrollDisbursementLog>) => {
      const index = dbData.payroll_disbursement_log.findIndex(p => p.id === id);
      if (index === -1) return null;
      dbData.payroll_disbursement_log[index] = {
        ...dbData.payroll_disbursement_log[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      saveDb();
      return dbData.payroll_disbursement_log[index];
    }
  },

  salary_pool_arrears_ledger: {
    findMany: () => dbData.salary_pool_arrears_ledger,
    findUnique: (id: string) => dbData.salary_pool_arrears_ledger.find(s => s.id === id),
    create: (log: Omit<SalaryPoolArrearsLedger, "id" | "created_at" | "updated_at">) => {
      const newLog: SalaryPoolArrearsLedger = {
        ...log,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dbData.salary_pool_arrears_ledger.push(newLog);
      saveDb();
      return newLog;
    },
    update: (id: string, updates: Partial<SalaryPoolArrearsLedger>) => {
      const index = dbData.salary_pool_arrears_ledger.findIndex(s => s.id === id);
      if (index === -1) return null;
      dbData.salary_pool_arrears_ledger[index] = {
        ...dbData.salary_pool_arrears_ledger[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      saveDb();
      return dbData.salary_pool_arrears_ledger[index];
    }
  },

  salary_pool_person_owed: {
    findMany: () => dbData.salary_pool_person_owed,
    findUnique: (id: string) => dbData.salary_pool_person_owed.find(s => s.id === id),
    findByEmployeeId: (employeeId: string) => dbData.salary_pool_person_owed.find(s => s.employee_cost_basis_id === employeeId),
    create: (owed: Omit<SalaryPoolPersonOwed, "id" | "created_at" | "updated_at">) => {
      const newOwed: SalaryPoolPersonOwed = {
        ...owed,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dbData.salary_pool_person_owed.push(newOwed);
      saveDb();
      return newOwed;
    },
    update: (id: string, amount_owed: number, note?: string) => {
      const index = dbData.salary_pool_person_owed.findIndex(s => s.id === id);
      if (index === -1) return null;
      dbData.salary_pool_person_owed[index] = {
        ...dbData.salary_pool_person_owed[index],
        amount_owed,
        note,
        updated_at: new Date().toISOString()
      };
      saveDb();
      return dbData.salary_pool_person_owed[index];
    }
  },

  drawings: {
    findMany: () => dbData.drawings,
    create: (drawing: Omit<Drawing, "id" | "created_at" | "updated_at">) => {
      const newDrawing: Drawing = {
        ...drawing,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      dbData.drawings.push(newDrawing);
      saveDb();
      return newDrawing;
    }
  },

  audit_logs: {
    findMany: () => dbData.audit_logs,
    create: (log: Omit<AuditLog, "id" | "created_at">) => {
      const newLog: AuditLog = {
        ...log,
        id: generateUUID(),
        created_at: new Date().toISOString()
      };
      dbData.audit_logs.push(newLog);
      if (dbData.audit_logs.length > 500) {
        dbData.audit_logs.shift();
      }
      saveDb();
      return newLog;
    }
  },

  import_batches: {
    findMany: () => dbData.import_batches,
    create: (batch: Omit<ImportBatch, "id" | "date">) => {
      const newBatch: ImportBatch = {
        ...batch,
        id: generateUUID(),
        date: new Date().toISOString()
      };
      dbData.import_batches.push(newBatch);
      saveDb();
      return newBatch;
    },
    rollback: (batchId: string) => {
      dbData.import_batches = dbData.import_batches.filter(b => b.id !== batchId);
      saveDb();
      return true;
    }
  }
};

/**
 * Authentication Helper Functions (JWT signing without libraries for portability)
 */
export function createToken(payload: any, expiresInSeconds = 86400): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payloadBase64 = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payloadBase64}`).digest("base64url");
  return `${header}.${payloadBase64}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const [header, payload, signature] = token.split(".");
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decodedPayload;
  } catch (err) {
    return null;
  }
}
