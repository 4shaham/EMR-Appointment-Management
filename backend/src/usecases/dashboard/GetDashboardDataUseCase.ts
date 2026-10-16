import {
  IDashboardRepository,
  DashboardData,
} from "../../repositories/interfaces/IDashboardRepository";
import { UserRole } from "../../types";
import { AppError } from "../../utils/AppError";

interface GetDashboardDataInput {
  userId: string;
  role: UserRole;
  date?: string;
}

export class GetDashboardDataUseCase {
  constructor(private dashboardRepo: IDashboardRepository) {}

  async execute(input: GetDashboardDataInput): Promise<DashboardData> {
    // Validate or default date to YYYY-MM-DD
    let targetDate = input.date;
    if (!targetDate) {
      targetDate = new Date().toISOString().split("T")[0];
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        throw new AppError("Invalid date format. Expected YYYY-MM-DD", 400);
      }
    }

    switch (input.role) {
      case "super_admin":
        return this.dashboardRepo.getSuperAdminData(targetDate);

      case "doctor":
        // Doctor identity is derived solely from authenticated userId
        return this.dashboardRepo.getDoctorData(input.userId, targetDate);

      case "receptionist":
        return this.dashboardRepo.getReceptionistData(targetDate);

      default:
        throw new AppError("Unauthorized role for dashboard access", 403);
    }
  }
}
