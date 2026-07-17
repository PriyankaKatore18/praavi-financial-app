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
  AuditLog, ImportBatch, TransferStatus, ReimbursementStatus, PayrollStatus, ArrearsStatus
} from "../src/types";

// Database storage file path
const DB_FILE = path.join(process.cwd(), "db.json");

// JWT secret key (auto-generated once if not exists)
let JWT_SECRET = process.env.JWT_SECRET || "praavi_secret_key_1234_secure";

interface DatabaseSchema {
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
  // 1. Seed Default Users
  if (dbData.users.length === 0) {
    dbData.users = [
      {
        id: "u-admin",
        full_name: "Praavi Admin",
        email: "admin@praavi.com",
        password_hash: hashPassword("admin123"),
        role: UserRole.ADMIN,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "u-head",
        full_name: "Finance Head Pooja",
        email: "head@praavi.com",
        password_hash: hashPassword("head123"),
        role: UserRole.FINANCE_HEAD,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "u-accountant",
        full_name: "Praavi Accountant",
        email: "accountant@praavi.com",
        password_hash: hashPassword("accountant123"),
        role: UserRole.ACCOUNTANT,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  // 2. Seed Default Settings
  if (dbData.settings.length === 0) {
    dbData.settings = [
      {
        id: "settings-global",
        target_profit_margin: 0.15,
        marketing_cap_pct: 0.12,
        current_month_number: 4, // Month 4 is July (FY starts in April)
        webdev_marketing_budget: 45000,
        dm_marketing_budget: 45000,
        financial_year_start_month: 4,
        currency_code: "INR",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  // 3. Seed Accounts
  if (dbData.accounts.length === 0) {
    dbData.accounts = [
      {
        id: "ba-sbi-current",
        name: "SBI Current",
        account_type: AccountType.BANK,
        opening_balance: 1500000, // ₹15,00,000.00
        actual_balance: 1500000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "ba-axis-current",
        name: "Axis Current",
        account_type: AccountType.BANK,
        opening_balance: 1000000, // ₹10,00,000.00
        actual_balance: 1000000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "ba-boi-savings",
        name: "BOI Savings (Pooja)",
        account_type: AccountType.BANK,
        opening_balance: 200000, // ₹2,00,000.00
        actual_balance: 200000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "ba-kotak",
        name: "Kotak (Rent/EMI)",
        account_type: AccountType.BANK,
        opening_balance: 50000, // ₹50,000.00
        actual_balance: 50000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "ba-janseva",
        name: "Janseva (Profit)",
        account_type: AccountType.BANK,
        opening_balance: 25000, // ₹25,000.00
        actual_balance: 25000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "ba-axis-savings",
        name: "Axis Savings",
        account_type: AccountType.BANK,
        opening_balance: 15000, // ₹15,000.00
        actual_balance: 15000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  // 4. Seed Marketing Cards
  if (dbData.marketing_cards.length === 0) {
    dbData.marketing_cards = [
      {
        id: "mc-webdev-meta",
        name: "Webakoof Meta Ads Card",
        department: "web_dev",
        opening_balance: 50000, // ₹50,000.00
        actual_balance: 50000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "mc-dm-credit",
        name: "Praavi Credit Card",
        department: "digital_marketing",
        opening_balance: 50000, // ₹50,000.00
        actual_balance: 50000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  // 5. Seed 20 Cost Basis items (Team, Management, Overheads)
  if (dbData.cost_basis.length === 0) {
    dbData.cost_basis = [
      // Web Development Team
      { id: "cb-prajakta", category: CostCategory.TEAM_WEBDEV, name: "Prajakta", monthly_amount: 27000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-abhi", category: CostCategory.TEAM_WEBDEV, name: "Abhi", monthly_amount: 25500, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-vaishnavee-web", category: CostCategory.TEAM_WEBDEV, name: "Vaishnavee", monthly_amount: 25000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-bhushan", category: CostCategory.TEAM_WEBDEV, name: "Bhushan", monthly_amount: 20000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-vipin", category: CostCategory.TEAM_WEBDEV, name: "Vipin", monthly_amount: 20000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-priyanka", category: CostCategory.TEAM_WEBDEV, name: "Priyanka", monthly_amount: 15000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

      // Digital Marketing Team
      { id: "cb-shreyas", category: CostCategory.TEAM_DM, name: "Shreyas", monthly_amount: 35000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-prathamesh", category: CostCategory.TEAM_DM, name: "Prathamesh", monthly_amount: 22000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-shradhha", category: CostCategory.TEAM_DM, name: "Shradhha", monthly_amount: 18000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-ayush", category: CostCategory.TEAM_DM, name: "Ayush", monthly_amount: 21000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-vaishnavee-k", category: CostCategory.TEAM_DM, name: "Vaishnavee K", monthly_amount: 6000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-pratik", category: CostCategory.TEAM_DM, name: "Pratik", monthly_amount: 14000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-amrut", category: CostCategory.TEAM_DM, name: "Amrut", monthly_amount: 10000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-sumedh", category: CostCategory.TEAM_DM, name: "Sumedh", monthly_amount: 5000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

      // Management
      { id: "cb-pooja", category: CostCategory.MANAGEMENT, name: "Pooja", monthly_amount: 60000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-malhar", category: CostCategory.MANAGEMENT, name: "Malhar", monthly_amount: 35000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-vishal", category: CostCategory.MANAGEMENT, name: "Vishal", monthly_amount: 40000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-aryan", category: CostCategory.MANAGEMENT, name: "Aryan", monthly_amount: 15000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-tanuja", category: CostCategory.MANAGEMENT, name: "Tanuja", monthly_amount: 10000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-sakshi", category: CostCategory.MANAGEMENT, name: "Sakshi", monthly_amount: 18000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

      // Overheads
      { id: "cb-rent", category: CostCategory.OVERHEAD, name: "Rent", monthly_amount: 40000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-car-emi", category: CostCategory.OVERHEAD, name: "Car EMI", monthly_amount: 40000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-subscriptions", category: CostCategory.OVERHEAD, name: "Subscriptions", monthly_amount: 12000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-light-bill", category: CostCategory.OVERHEAD, name: "Light bill", monthly_amount: 11000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-laptop-rentals", category: CostCategory.OVERHEAD, name: "Laptop rentals", monthly_amount: 13200, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "cb-misc", category: CostCategory.OVERHEAD, name: "Misc", monthly_amount: 7000, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
  }

  // 6. Seed default salary_pool_person_owed outstanding amounts for employees (July migration preparation)
  if (dbData.salary_pool_person_owed.length === 0) {
    dbData.salary_pool_person_owed = dbData.cost_basis
      .filter(cb => cb.category !== CostCategory.OVERHEAD)
      .map(cb => ({
        id: `spo-${cb.id}`,
        employee_name: cb.name,
        employee_cost_basis_id: cb.id,
        amount_owed: Math.round(cb.monthly_amount * 0.1), // Seed 10% outstanding by default for interesting tracker analytics
        note: "July 2026 legacy arrears",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
  }
}

/**
 * Setup Supabase Postgres database pool
 */
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

const pool = new pg.Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Initialize Supabase Postgres and load database state
 */
export async function initSupabaseDb() {
  if (!SUPABASE_DB_URL) {
    console.log("SUPABASE_DB_URL is not set. Falling back to local db.json persistence...");
    seedDatabase();
    return;
  }

  try {
    console.log("Connecting to Supabase PostgreSQL Database...");
    
    // Create the state table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS praavi_state (
        id INT PRIMARY KEY,
        state_json JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Fetch the latest state from Supabase
    const res = await pool.query("SELECT state_json FROM praavi_state WHERE id = 1");
    if (res.rows.length > 0) {
      console.log("Database state successfully loaded from Supabase PostgreSQL!");
      dbData = res.rows[0].state_json;
      // Also sync it locally to db.json as a backup
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
    console.error("❌ Error initializing Supabase Database:", err);
    console.log("Falling back to local db.json persistence...");
    // Fallback to local db.json if database connection fails
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
    // Seed database items
    seedDatabase();
    // Flush back to ensure schemas are saved
    saveDb();
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
    
    // Asynchronously save to Supabase Postgres
    pool.query(
      "INSERT INTO praavi_state (id, state_json, updated_at) VALUES (1, $1, NOW()) ON CONFLICT (id) DO UPDATE SET state_json = EXCLUDED.state_json, updated_at = NOW()",
      [dbData]
    ).catch(err => {
      console.error("❌ Failed to save state to Supabase PostgreSQL:", err);
    });
  } catch (err) {
    console.error("Error saving database:", err);
  }
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
      // Soft-delete: mark is_active = false as required
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
      // Prune logs if they exceed 500 to save space in db.json
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
      // Find all items imported in this batch, or payments/drawings/etc, but let's implement soft rollback or delete
      // To keep it simple, we delete payments and restore state if needed.
      // We will define manual transaction rollback in the routes.
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
      return null; // Expired
    }
    return decodedPayload;
  } catch (err) {
    return null;
  }
}
