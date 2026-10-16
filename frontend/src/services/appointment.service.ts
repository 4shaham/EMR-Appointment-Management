import { api } from "./api";
import { Appointment, ApiResponse, SlotsResponse } from "../types";

export interface BookAppointmentPayload {
  doctorId: string;
  departmentId: string;
  appointmentDate: string; // "YYYY-MM-DD"
  slotTime: string;        // "HH:MM"
  purpose?: string;
  patientId?: string;      // For existing patient
  newPatient?: {           // For new patient auto-creation
    name: string;
    mobile: string;
    email?: string;
    age: number;
    gender: "male" | "female" | "other";
    address?: string;
  };
}

export interface ListAppointmentsParams {
  page?: number;
  limit?: number;
  doctorId?: string;
  departmentId?: string;
  patientId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const appointmentService = {
  async book(payload: BookAppointmentPayload): Promise<Appointment> {
    const res = await api.post<ApiResponse<Appointment>>("/appointments", payload);
    return res.data.data;
  },

  async list(params?: ListAppointmentsParams): Promise<ApiResponse<Appointment[]>> {
    const res = await api.get<ApiResponse<Appointment[]>>("/appointments", { params });
    return res.data;
  },

  async getById(id: string): Promise<Appointment> {
    const res = await api.get<ApiResponse<Appointment>>(`/appointments/${id}`);
    return res.data.data;
  },

  async update(id: string, payload: { purpose?: string; notes?: string }): Promise<Appointment> {
    const res = await api.put<ApiResponse<Appointment>>(`/appointments/${id}`, payload);
    return res.data.data;
  },

  async cancel(id: string, cancelReason: string): Promise<Appointment> {
    const res = await api.delete<ApiResponse<Appointment>>(`/appointments/${id}`, {
      data: { cancelReason },
    });
    return res.data.data;
  },

  async markArrived(id: string): Promise<Appointment> {
    const res = await api.post<ApiResponse<Appointment>>(`/appointments/${id}/arrive`);
    return res.data.data;
  },

  async complete(id: string, notes?: string): Promise<Appointment> {
    const res = await api.post<ApiResponse<Appointment>>(`/appointments/${id}/complete`, { notes });
    return res.data.data;
  },

  async getSlots(doctorId: string, date: string, departmentId?: string): Promise<SlotsResponse> {
    const res = await api.get<ApiResponse<SlotsResponse>>("/slots", {
      params: { doctorId, date, departmentId },
    });
    return res.data.data;
  },
};
