export type UserRole = "super_admin" | "receptionist" | "doctor";

export type AppointmentStatus = "scheduled" | "arrived" | "completed" | "cancelled";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Department {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  doctorCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Doctor {
  _id: string;
  userId: string | User;
  departmentId: string | Department;
  name: string;
  specialization: string;
  qualification?: string;
  experience?: number;
  phone?: string;
  isActive: boolean;
}

export interface UpdateDoctorPayload {
  name?: string;
  departmentId?: string;
  specialization?: string;
  qualification?: string;
  experience?: number;
  phone?: string;
  isActive?: boolean;
}


export interface TimeRange {
  id?: string;
  start: string; // "HH:MM"
  end: string;
  label?: string;
}

export interface DaySchedule {
  day: DayOfWeek;
  sessions: TimeRange[];
  breaks: TimeRange[];
  slotDurationMinutes: number;
}

export interface Schedule {
  _id: string;
  doctorId: string;
  workingDays: DaySchedule[];
  isActive: boolean;
}

export interface Patient {
  _id: string;
  patientId: string;
  name: string;
  mobile: string;
  email?: string;
  age?: number;
  gender?: "male" | "female" | "other";
  address?: string;
  bloodGroup?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Appointment {
  _id: string;
  patientId: Patient;
  doctorId: Doctor;
  departmentId: Department;
  appointmentDate: string;
  slotTime: string;
  status: AppointmentStatus;
  purpose?: string;
  notes?: string;
  bookedBy: User;
  arrivedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlotInfo {
  time: string;
  isBooked: boolean;
  isAvailable: boolean;
  isPast: boolean;
}

export interface SlotsResponse {
  doctor: Doctor;
  date: string;
  slots: SlotInfo[];
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
}

export interface AuditLog {
  _id: string;
  userId: User;
  userRole: UserRole;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SuperAdminDashboardData {
  role: "super_admin";
  date: string;
  totals: {
    doctors: number;
    activeDoctors: number;
    receptionists: number;
    departments: number;
    appointments: number;
  };
  today: {
    total: number;
    scheduled: number;
    arrived: number;
    completed: number;
    cancelled: number;
  };
  allTimeStatus: {
    scheduled: number;
    arrived: number;
    completed: number;
    cancelled: number;
  };
  recentAppointments: Appointment[];
}

export interface DoctorDashboardData {
  role: "doctor";
  date: string;
  doctorProfile: {
    id: string;
    name: string;
    specialization: string;
    departmentName?: string;
  };
  totalAppointments: number;
  today: {
    total: number;
    scheduled: number;
    arrived: number;
    completed: number;
    cancelled: number;
  };
  allTimeStatus: {
    scheduled: number;
    arrived: number;
    completed: number;
    cancelled: number;
  };
  upcomingAppointments: Appointment[];
  todayAppointmentsList: Appointment[];
}

export interface ReceptionistDashboardData {
  role: "receptionist";
  date: string;
  totals: {
    doctors: number;
    departments: number;
  };
  bookingStatistics: {
    totalBooked: number;
    todayTotal: number;
    scheduled: number;
    arrived: number;
    completed: number;
    cancelled: number;
  };
  todayAppointmentsList: Appointment[];
  activeDoctorsList: Doctor[];
}

export type DashboardData =
  | SuperAdminDashboardData
  | DoctorDashboardData
  | ReceptionistDashboardData;

