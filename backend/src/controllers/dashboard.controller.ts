import { Request, Response, NextFunction } from "express";
import { GetDashboardDataUseCase } from "../usecases/dashboard/GetDashboardDataUseCase";
import { sendSuccess } from "../utils/response";

export class DashboardController {
  constructor(private getDashboardDataUseCase: GetDashboardDataUseCase) {}

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      const date = req.query.date ? String(req.query.date) : undefined;

      const data = await this.getDashboardDataUseCase.execute({
        userId: user.userId,
        role: user.role,
        date,
      });

      sendSuccess(res, "Dashboard data retrieved successfully", data, 200);
    } catch (err) {
      next(err);
    }
  };
}
