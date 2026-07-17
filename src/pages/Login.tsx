/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Lock, Mail, Eye, EyeOff, ShieldAlert, ArrowRight } from "lucide-react";
import { api } from "../services/api";

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all credentials.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await api.auth.login(email, password);
      onLoginSuccess(response.user);
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 font-sans relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800 p-8 shadow-2xl z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <Lock size={22} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white leading-none">Praavi Consultants</h1>
          <p className="text-xs text-slate-400 tracking-wider font-mono mt-2">FINANCIAL MANAGEMENT SYSTEM</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-2">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accountant@praavi.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <button 
                type="button" 
                onClick={() => setError("Please contact your administrator Pooja to reset your password.")}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="rounded bg-slate-900 border-slate-800 text-emerald-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-slate-300">Remember this device</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 disabled:opacity-50"
          >
            <span>{loading ? "Authenticating Session..." : "Secure Sign In"}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Demo Accounts Panel */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Quick Sandbox Access
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleQuickLogin("admin@praavi.com", "admin123")}
              className="py-1.5 px-3 rounded bg-slate-900 hover:bg-slate-850 text-[11px] font-medium text-rose-300 border border-slate-800 hover:border-rose-900/40 transition-all flex items-center justify-between"
            >
              <span>1. Administrator (Admin)</span>
              <span className="text-slate-500 font-mono">admin123</span>
            </button>
            <button
              onClick={() => handleQuickLogin("head@praavi.com", "head123")}
              className="py-1.5 px-3 rounded bg-slate-900 hover:bg-slate-850 text-[11px] font-medium text-amber-300 border border-slate-800 hover:border-amber-900/40 transition-all flex items-center justify-between"
            >
              <span>2. Pooja (Finance Head)</span>
              <span className="text-slate-500 font-mono">head123</span>
            </button>
            <button
              onClick={() => handleQuickLogin("accountant@praavi.com", "accountant123")}
              className="py-1.5 px-3 rounded bg-slate-900 hover:bg-slate-850 text-[11px] font-medium text-teal-300 border border-slate-800 hover:border-teal-900/40 transition-all flex items-center justify-between"
            >
              <span>3. General Accountant</span>
              <span className="text-slate-500 font-mono">accountant123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
