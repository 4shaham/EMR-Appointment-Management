import { api } from "./api";
import { User, Doctor, ApiResponse } from "../types";

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponseData> {
    const res = await api.post<ApiResponse<LoginResponseData>>("/auth/login", {
      email,
      password,
    });
    const data = res.data.data;
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    return data;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  },

  async getMe(): Promise<{ user: User; doctorProfile: Doctor | null }> {
    const res = await api.get<
      ApiResponse<{ user: User; doctorProfile: Doctor | null }>
    >("/auth/me");
    return res.data.data;
  },
};
