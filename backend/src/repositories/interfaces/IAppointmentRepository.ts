import { IAppointment } from "../../models/Appointment.model";
import { AppointmentStatus, PaginationMeta } from "../../types";

export interface IAppointmentFilter {
  doctorId?: string;
  departmentId?: string;
  patientId?: string;
  status?: AppointmentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string; // patient name / mobile
}

export interface IAppointmentListResult {
  appointments: IAppointment[];
  meta: PaginationMeta;
}

export interface IAppointmentRepository {
  findById(id: string): Promise<IAppointment | null>;
  findBookedSlots(doctorId: string, date: Date): Promise<string[]>;
  list(
    filter: IAppointmentFilter,
    page: number,
    limit: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<IAppointmentListResult>;
  create(data: Partial<IAppointment>): Promise<IAppointment>;
  update(id: string, data: Partial<IAppointment>): Promise<IAppointment | null>;
  softDelete(id: string, cancelReason?: string): Promise<IAppointment | null>;
}
