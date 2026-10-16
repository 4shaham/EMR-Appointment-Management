import { api } from "./api";
import { ApiResponse, DashboardData } from "../types";

export const dashboardService = {
  getStats: async (date?: string): Promise<DashboardData> => {
    const params = date ? { date } : {};
    const response = await api.get<ApiResponse<DashboardData>>("/dashboard", { params });
    return response.data.data;
  },
};
