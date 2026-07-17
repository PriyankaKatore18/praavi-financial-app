/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./server/routes";
import { runUnitTests } from "./src/domain/finance/calculations.test";
import { initSupabaseDb } from "./server/db";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 0. Initialize Supabase Database
  await initSupabaseDb();

  // 1. Run Financial Engine Unit Tests on Startup to confirm calculation integrity
  try {
    console.log("[Test Suite] Running financial model validation tests...");
    const testResults = runUnitTests();
    console.log("[Test Suite] Financial calculations are 100% correct!");
    testResults.results.forEach(log => console.log(`  ${log}`));
  } catch (err: any) {
    console.error("❌ CRITICAL: Financial calculations failed unit tests!", err.message);
    process.exit(1); // Block startup if calculation rules are violated
  }

  // 2. Parsers
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // 3. API Router
  app.use("/api", apiRouter);

  // 4. Vite middleware or production static asset server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Dev Server] Vite middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Prod Server] Static delivery mounted.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Praavi Finance App Server is running on http://localhost:${PORT}`);
  });
}

startServer();
