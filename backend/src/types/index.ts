// ─── Roles ───────────────────────────────────────────────────────────────────
export type UserRole = "super_admin" | "receptionist" | "doctor";

// ─── Appointment Status ───────────────────────────────────────────────────────
export type AppointmentStatus = "scheduled" | "arrived" | "completed" | "cancelled";

// ─── Days of week ─────────────────────────────────────────────────────────────
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

// ─── Generic API Response ────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Pagination Query ─────────────────────────────────────────────────────────
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Audit Actions ────────────────────────────────────────────────────────────
export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_UPDATED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_ARRIVED"
  | "APPOINTMENT_COMPLETED"
  | "SCHEDULE_UPDATED"
  | "PATIENT_CREATED"
  | "DOCTOR_CREATED"
  | "DOCTOR_UPDATED"
  | "DEPARTMENT_CREATED"
  | "DEPARTMENT_UPDATED"
  | "DEPARTMENT_DELETED"
  | "USER_CREATED";


// ─── JWT Payload ──────────────────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── Express augmentation ─────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
