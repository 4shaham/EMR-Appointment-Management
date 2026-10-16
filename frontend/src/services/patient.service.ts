import { api } from "./api";
import { Patient, ApiResponse } from "../types";

export interface PatientSearchParams {
  patientId?: string;
  mobile?: string;
  name?: string;
}

export interface CreatePatientPayload {
  name: string;
  mobile: string;
  email?: string;
  age: number;
  gender: "male" | "female" | "other";
  address?: string;
  bloodGroup?: string;
}

export const patientService = {
  async search(params: PatientSearchParams): Promise<Patient[]> {
    const res = await api.get<ApiResponse<Patient[]>>("/patients", { params });
    return res.data.data;
  },

  async getById(id: string): Promise<Patient> {
    const res = await api.get<ApiResponse<Patient>>(`/patients/${id}`);
    return res.data.data;
  },

  async create(payload: CreatePatientPayload): Promise<Patient> {
    const res = await api.post<ApiResponse<Patient>>("/patients", payload);
    return res.data.data;
  },
};
