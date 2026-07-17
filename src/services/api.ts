/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from "../types";

const API_BASE = "/api";

export function getAuthToken(): string | null {
  return localStorage.getItem("praavi_jwt_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("praavi_jwt_token", token);
}

export function clearAuthSession() {
  localStorage.removeItem("praavi_jwt_token");
  localStorage.removeItem("praavi_user_profile");
}

export function getStoredUser() {
  const profile = localStorage.getItem("praavi_user_profile");
  return profile ? JSON.parse(profile) : null;
}

export function setStoredUser(user: any) {
  localStorage.setItem("praavi_user_profile", JSON.stringify(user));
}

/**
 * Standard HTTP fetch client with authentication header injected.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await request<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setAuthToken(res.token);
      setStoredUser(res.user);
      return res;
    },
    me: async () => {
      return request<{ user: any }>("/auth/me");
    }
  },

  dashboard: {
    getSummary: async () => {
      return request<any>("/dashboard/summary");
    }
  },

  calculator: {
    calculateDistribution: async (amount: number, department: string, landed_in_account_id: string, gst_type: string) => {
      return request<any>("/calculator/distribution", {
        method: "POST",
        body: JSON.stringify({ amount, department, landed_in_account_id, gst_type })
      });
    }
  },

  payments: {
    getAll: async () => {
      return request<any[]>("/payments");
    },
    getById: async (id: string) => {
      return request<any>(`/payments/${id}`);
    },
    create: async (payload: any) => {
      return request<any>("/payments", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    update: async (id: string, payload: any) => {
      return request<any>(`/payments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    },
    delete: async (id: string) => {
      return request<any>(`/payments/${id}`, {
        method: "DELETE"
      });
    }
  },

  accounts: {
    getAll: async () => {
      return request<any[]>("/accounts");
    },
    getById: async (id: string) => {
      return request<any>(`/accounts/${id}`);
    },
    updateActualBalance: async (id: string, balance: number) => {
      return request<any>(`/accounts/${id}/actual-balance`, {
        method: "PATCH",
        body: JSON.stringify({ actual_balance: balance })
      });
    }
  },

  transfers: {
    getAll: async () => {
      return request<any>("/transfers");
    },
    createManual: async (payload: any) => {
      return request<any>("/transfers", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    updateDistributionStatus: async (id: string, status: string) => {
      return request<any>(`/distribution-transfers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
    }
  },

  reimbursements: {
    getAll: async () => {
      return request<any[]>("/reimbursements");
    },
    create: async (payload: any) => {
      return request<any>("/reimbursements", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    update: async (id: string, payload: any) => {
      return request<any>(`/reimbursements/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    }
  },

  payroll: {
    getAll: async () => {
      return request<any[]>("/payroll");
    },
    create: async (payload: any) => {
      return request<any>("/payroll", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    updateStatus: async (id: string, status: string, paid_from_account_id?: string) => {
      return request<any>(`/payroll/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, paid_from_account_id })
      });
    }
  },

  salaryPool: {
    getData: async () => {
      return request<any>("/salary-pool");
    },
    addPersonOwed: async (payload: any) => {
      return request<any>("/salary-pool/person-owed", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    addArrearsEntry: async (payload: any) => {
      return request<any>("/salary-pool/arrears", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    updateArrearsStatus: async (id: string, status: string, paid_from_account_id?: string) => {
      return request<any>(`/salary-pool/arrears/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, paid_from_account_id })
      });
    }
  },

  drawings: {
    getAll: async () => {
      return request<any[]>("/drawings");
    },
    create: async (payload: any) => {
      return request<any>("/drawings", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  },

  costBasis: {
    getAll: async () => {
      return request<any[]>("/cost-basis");
    },
    create: async (payload: any) => {
      return request<any>("/cost-basis", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    update: async (id: string, payload: any) => {
      return request<any>(`/cost-basis/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    }
  },

  settings: {
    get: async () => {
      return request<any>("/settings");
    },
    update: async (payload: any) => {
      return request<any>("/settings", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    }
  },

  auditLogs: {
    getAll: async () => {
      return request<any[]>("/audit-logs");
    }
  },

  reports: {
    getReport: async (type: string) => {
      return request<any>(`/reports/${type}`);
    }
  },

  migration: {
    importBatch: async (payload: any) => {
      return request<any>("/migration/import", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  }
};
