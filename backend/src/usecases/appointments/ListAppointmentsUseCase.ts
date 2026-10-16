import { IAppointmentRepository, IAppointmentFilter } from "../../repositories/interfaces/IAppointmentRepository";
import { AppointmentStatus } from "../../types";

interface ListAppointmentsInput {
  doctorId?: string;
  departmentId?: string;
  patientId?: string;
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  // For doctor role: restrict to own appointments
  restrictToDoctorId?: string;
}

export class ListAppointmentsUseCase {
  constructor(private appointmentRepo: IAppointmentRepository) {}

  async execute(input: ListAppointmentsInput) {
    const filter: IAppointmentFilter = {};

    // If the caller is a doctor, enforce own-data restriction
    if (input.restrictToDoctorId) {
      filter.doctorId = input.restrictToDoctorId;
    } else if (input.doctorId) {
      filter.doctorId = input.doctorId;
    }

    if (input.departmentId) filter.departmentId = input.departmentId;
    if (input.patientId) filter.patientId = input.patientId;
    if (input.status) filter.status = input.status;
    if (input.search) filter.search = input.search;

    if (input.dateFrom) filter.dateFrom = new Date(`${input.dateFrom}T00:00:00.000Z`);
    if (input.dateTo) filter.dateTo = new Date(`${input.dateTo}T23:59:59.999Z`);

    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 10));

    return this.appointmentRepo.list(
      filter,
      page,
      limit,
      input.sortBy,
      input.sortOrder
    );
  }
}
