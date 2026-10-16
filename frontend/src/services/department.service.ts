import { api } from "./api";
import { Department, ApiResponse } from "../types";

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export const departmentService = {
  async getAll(showAll = false): Promise<Department[]> {
    const res = await api.get<ApiResponse<Department[]>>("/departments", {
      params: showAll ? { all: "true" } : undefined,
    });
    return res.data.data;
  },

  async getById(id: string): Promise<Department> {
    const res = await api.get<ApiResponse<Department>>(`/departments/${id}`);
    return res.data.data;
  },

  async create(payload: CreateDepartmentPayload | string, description?: string): Promise<Department> {
    const body =
      typeof payload === "string"
        ? { name: payload, description }
        : payload;
    const res = await api.post<ApiResponse<Department>>("/departments", body);
    return res.data.data;
  },

  async update(id: string, payload: UpdateDepartmentPayload): Promise<Department> {
    const res = await api.put<ApiResponse<Department>>(`/departments/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete<ApiResponse<void>>(`/departments/${id}`);
  },
};
