import { api } from "./api";
import { Doctor, Schedule, DaySchedule, ApiResponse, UpdateDoctorPayload } from "../types";

export interface CreateDoctorPayload {
  name: string;
  email: string;
  password: string;
  departmentId: string;
  specialization: string;
  qualification?: string;
  experience?: number;
  phone?: string;
}

export const doctorService = {
  async getAll(departmentId?: string, all?: boolean): Promise<Doctor[]> {
    const res = await api.get<ApiResponse<Doctor[]>>("/doctors", {
      params: { departmentId, all: all ? "true" : undefined },
    });
    return res.data.data;
  },

  async getById(doctorId: string): Promise<Doctor> {
    const res = await api.get<ApiResponse<Doctor>>(`/doctors/${doctorId}`);
    return res.data.data;
  },

  async create(payload: CreateDoctorPayload): Promise<Doctor> {
    const res = await api.post<ApiResponse<Doctor>>("/doctors", payload);
    return res.data.data;
  },

  async update(doctorId: string, payload: UpdateDoctorPayload): Promise<Doctor> {
    const res = await api.put<ApiResponse<Doctor>>(`/doctors/${doctorId}`, payload);
    return res.data.data;
  },

  async getSchedule(doctorId: string): Promise<Schedule> {
    const res = await api.get<ApiResponse<Schedule>>(`/doctors/${doctorId}/schedule`);
    return res.data.data;
  },

  async upsertSchedule(doctorId: string, workingDays: DaySchedule[]): Promise<Schedule> {
    const res = await api.put<ApiResponse<Schedule>>(`/doctors/${doctorId}/schedule`, {
      workingDays,
    });
    return res.data.data;
  },
};
