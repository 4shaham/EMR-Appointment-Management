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
  recentAppointments: unknown[];
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
  upcomingAppointments: unknown[];
  todayAppointmentsList: unknown[];
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
  todayAppointmentsList: unknown[];
  activeDoctorsList: unknown[];
}

export type DashboardData =
  | SuperAdminDashboardData
  | DoctorDashboardData
  | ReceptionistDashboardData;

export interface IDashboardRepository {
  getSuperAdminData(targetDate: string): Promise<SuperAdminDashboardData>;
  getDoctorData(userId: string, targetDate: string): Promise<DoctorDashboardData>;
  getReceptionistData(targetDate: string): Promise<ReceptionistDashboardData>;
}
