import fs from "fs";
import path from "path";
import { getDbSnapshot, initSupabaseDb, resetDbToSeedState } from "../server/db";

async function main() {
  await initSupabaseDb();

  const backupsDir = path.join(process.cwd(), "backups");
  fs.mkdirSync(backupsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupsDir, `praavi-state-backup-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(getDbSnapshot(), null, 2), "utf-8");

  const resetState = resetDbToSeedState();

  console.log(`Backup saved to ${backupPath}`);
  console.log("Database reset complete.");
  console.log(`Users: ${resetState.users.length}`);
  console.log(`Accounts: ${resetState.accounts.length}`);
  console.log(`Cost basis items: ${resetState.cost_basis.length}`);
  console.log(`Payments: ${resetState.payments.length}`);
  console.log(`Payroll entries: ${resetState.payroll_disbursement_log.length}`);
}

main().catch((error) => {
  console.error("Reset failed:", error);
  process.exit(1);
});
