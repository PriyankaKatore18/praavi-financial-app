/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, CreditCard, Calculator, Landmark, ShieldCheck, 
  UserSquare, FileSpreadsheet, Send, HelpCircle, Users, Settings, 
  History, LogOut, Menu, X, ArrowLeftRight, CheckSquare, Coins, ChevronLeft, ChevronRight
} from "lucide-react";
import { UserRole } from "../types";

interface LayoutProps {
  activePage: string;
  setActivePage: (page: string) => void;
  user: {
    full_name: string;
    email: string;
    role: UserRole;
  };
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ activePage, setActivePage, user, onLogout, children }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [localTime, setLocalTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLocalTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: "dashboard", name: "Dashboard", icon: LayoutDashboard, roles: [UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "payments", name: "Payments", icon: CreditCard, roles: [UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "calculator", name: "Calculator", icon: Calculator, roles: [UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "accounts", name: "Accounts", icon: Landmark, roles: [UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "salary_sheet", name: "Salary Sheet", icon: Coins, roles: [UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "salary_pool", name: "Salary Pool Tracker", icon: Users, roles: [UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "transfers", name: "Transfers", icon: ArrowLeftRight, roles: [UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "reimbursements", name: "Reimbursements", icon: Send, roles: [UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "payroll", name: "Payroll", icon: CheckSquare, roles: [UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "drawings", name: "Drawings", icon: HelpCircle, roles: [UserRole.ACCOUNTANT, UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "cost_basis", name: "Cost Basis", icon: UserSquare, roles: [UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "settings", name: "Settings", icon: Settings, roles: [UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "reports", name: "Reports", icon: FileSpreadsheet, roles: [UserRole.FINANCE_HEAD, UserRole.ADMIN] },
    { id: "migration", name: "Migration & Import", icon: ShieldCheck, roles: [UserRole.ADMIN] },
    { id: "audit_logs", name: "Audit Logs", icon: History, roles: [UserRole.FINANCE_HEAD, UserRole.ADMIN] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return "System Administrator";
      case UserRole.FINANCE_HEAD: return "Finance Head";
      case UserRole.ACCOUNTANT: return "Accountant";
      default: return "User";
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return "bg-rose-100 text-rose-800 border-rose-200";
      case UserRole.FINANCE_HEAD: return "bg-amber-100 text-amber-800 border-amber-200";
      case UserRole.ACCOUNTANT: return "bg-teal-100 text-teal-800 border-teal-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar for Desktop */}
      <aside 
        className={`hidden md:flex flex-col bg-slate-900 text-slate-200 transition-all duration-300 border-r border-slate-800 ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950">
          {!isSidebarCollapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-emerald-400 font-bold tracking-tight text-lg">PRAAVI</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">CONSULTANTS</span>
            </div>
          )}
          {isSidebarCollapsed && (
            <span className="mx-auto text-emerald-400 font-bold text-lg">PR</span>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage.startsWith(item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center py-2.5 px-3 rounded-lg text-sm font-medium transition-all group relative ${
                  isActive 
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/10" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <Icon size={18} className={`shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`} />
                {!isSidebarCollapsed && <span className="ml-3 truncate">{item.name}</span>}
                {isSidebarCollapsed && (
                  <div className="absolute left-16 scale-0 rounded bg-slate-950 px-2 py-1 text-xs font-semibold text-slate-100 shadow-xl border border-slate-800 group-hover:scale-100 transition-all origin-left z-50 whitespace-nowrap">
                    {item.name}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          {!isSidebarCollapsed ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-200 truncate">{user.full_name}</span>
                <span className="text-[11px] text-slate-500 truncate">{user.email}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getRoleColor(user.role)}`}>
                  {user.role.toUpperCase()}
                </span>
                <button 
                  onClick={onLogout}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Log Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={onLogout}
              className="w-full py-2 flex justify-center text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
              title="Log Out"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
          <aside className="relative flex flex-col w-72 max-w-[80%] h-full bg-slate-900 text-slate-200 shadow-2xl z-50">
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950">
              <div className="flex flex-col leading-none">
                <span className="text-emerald-400 font-bold tracking-tight text-lg">PRAAVI</span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">CONSULTANTS</span>
              </div>
              <button onClick={() => setIsMobileOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {filteredMenuItems.map(item => {
                const Icon = item.icon;
                const isActive = activePage.startsWith(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivePage(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`w-full flex items-center py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/10" 
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="ml-3">{item.name}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2">
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-slate-200">{user.full_name}</span>
                <span className="text-[11px] text-slate-500">{user.email}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getRoleColor(user.role)}`}>
                  {user.role.toUpperCase()}
                </span>
                <button 
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                FY 2026-27
              </span>
              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                | {localTime}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-semibold text-slate-800 leading-none">{user.full_name}</span>
              <span className="text-[10px] text-slate-400 leading-none mt-1">{getRoleLabel(user.role)}</span>
            </div>
            <div className={`h-8 w-8 rounded-full border flex items-center justify-center font-bold text-sm ${getRoleColor(user.role)}`}>
              {user.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Canvas Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
