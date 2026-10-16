import { api } from "./api";
import { User, AuditLog, ApiResponse, UserRole } from "../types";

export const adminService = {
  async createUser(payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<User> {
    const res = await api.post<ApiResponse<User>>("/users", payload);
    return res.data.data;
  },

  async getUsers(role?: UserRole): Promise<User[]> {
    const res = await api.get<ApiResponse<User[]>>("/users", {
      params: { role },
    });
    return res.data.data;
  },

  async getAuditLogs(page = 1, limit = 50): Promise<ApiResponse<AuditLog[]>> {
    const res = await api.get<ApiResponse<AuditLog[]>>("/audit-logs", {
      params: { page, limit },
    });
    return res.data;
  },
};
