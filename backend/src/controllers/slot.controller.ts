import { Request, Response, NextFunction } from "express";
import { GetSlotsUseCase } from "../usecases/slots/GetSlotsUseCase";
import { IDoctorRepository } from "../repositories/interfaces/IDoctorRepository";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";

export class SlotController {
  constructor(
    private getSlotsUseCase: GetSlotsUseCase,
    private doctorRepo: IDoctorRepository
  ) {}

  getSlots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let doctorId = req.query.doctorId as string | undefined;
      const date = req.query.date as string | undefined;
      let departmentId = req.query.departmentId as string | undefined;

      if (!date) throw new AppError("date query parameter is required.", 400);

      // If requesting user is a doctor, enforce viewing only their own slots
      if (req.user?.role === "doctor") {
        const doctorProfile = await this.doctorRepo.findByUserId(req.user.userId);
        if (!doctorProfile) {
          throw new AppError("Doctor profile not found for authenticated user.", 404);
        }

        const ownDocId = doctorProfile._id.toString();
        if (doctorId && doctorId !== "me" && doctorId !== ownDocId) {
          throw new AppError("Access denied: Doctors can only view their own schedule slots.", 403);
        }

        doctorId = ownDocId;
        const rawDept: any = doctorProfile.departmentId;
        const deptId = String(rawDept?._id || rawDept || "");
        if (deptId) departmentId = deptId;
      } else {
        if (!doctorId) throw new AppError("doctorId query parameter is required.", 400);
      }

      const result = await this.getSlotsUseCase.execute({
        doctorId,
        date,
        departmentId,
      });

      sendSuccess(res, "Slots retrieved successfully", result);
    } catch (err) {
      next(err);
    }
  };
}
