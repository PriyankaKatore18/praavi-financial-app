/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import PaymentDetail from "./pages/PaymentDetail";
import Calculator from "./pages/Calculator";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import SalarySheet from "./pages/SalarySheet";
import SalaryPoolTracker from "./pages/SalaryPoolTracker";
import Transfers from "./pages/Transfers";
import Reimbursements from "./pages/Reimbursements";
import Payroll from "./pages/Payroll";
import Drawings from "./pages/Drawings";
import CostBasis from "./pages/CostBasis";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Migration from "./pages/Migration";
import AuditLogs from "./pages/AuditLogs";
import { getStoredUser, clearAuthSession, getAuthToken, api } from "./services/api";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      try {
        const stored = getStoredUser();
        const token = getAuthToken();
        if (stored && token) {
          // Verify current token on start
          const check = await api.auth.me();
          if (check && check.user) {
            setUser(check.user);
          } else {
            clearAuthSession();
          }
        }
      } catch (err) {
        console.warn("Session expired or unauthorized start. Clearing active session.", err);
        clearAuthSession();
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, []);

  const handleLoginSuccess = (profile: any) => {
    setUser(profile);
    setActivePage("dashboard");
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-xs font-mono font-semibold tracking-widest uppercase">Initializing Praavi Ledger...</span>
      </div>
    );
  }

  // Not logged in -> Auth Screen
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // View dispatcher
  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard setActivePage={setActivePage} setSelectedId={setSelectedId} />;
      case "payments":
        return <Payments setActivePage={setActivePage} setSelectedId={setSelectedId} userRole={user.role} />;
      case "payments_detail":
        return <PaymentDetail paymentId={selectedId} onBack={() => setActivePage("payments")} userRole={user.role} />;
      case "calculator":
        return <Calculator />;
      case "accounts":
        return <Accounts setActivePage={setActivePage} setSelectedId={setSelectedId} userRole={user.role} />;
      case "accounts_detail":
        return <AccountDetail accountId={selectedId} onBack={() => setActivePage("accounts")} />;
      case "salary_sheet":
        return <SalarySheet />;
      case "salary_pool":
        return <SalaryPoolTracker />;
      case "transfers":
        return <Transfers />;
      case "reimbursements":
        return <Reimbursements />;
      case "payroll":
        return <Payroll />;
      case "drawings":
        return <Drawings />;
      case "cost_basis":
        return <CostBasis />;
      case "settings":
        return <Settings />;
      case "reports":
        return <Reports />;
      case "migration":
        return <Migration />;
      case "audit_logs":
        return <AuditLogs />;
      default:
        return <Dashboard setActivePage={setActivePage} setSelectedId={setSelectedId} />;
    }
  };

  return (
    <Layout activePage={activePage} setActivePage={setActivePage} user={user} onLogout={handleLogout}>
      {renderPage()}
    </Layout>
  );
}
