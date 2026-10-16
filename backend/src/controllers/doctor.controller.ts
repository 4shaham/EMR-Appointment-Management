import { Request, Response, NextFunction } from "express";
import { IDoctorRepository } from "../repositories/interfaces/IDoctorRepository";
import { IScheduleRepository } from "../repositories/interfaces/IScheduleRepository";
import { IDepartmentRepository } from "../repositories/interfaces/IDepartmentRepository";
import { IUserRepository } from "../repositories/interfaces/IUserRepository";
import { IAuditLogRepository } from "../repositories/interfaces/IAuditLogRepository";
import { UpsertScheduleUseCase } from "../usecases/schedule/UpsertScheduleUseCase";
import { CreateDoctorUseCase } from "../usecases/doctors/CreateDoctorUseCase";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";

export class DoctorController {
  constructor(
    private doctorRepo: IDoctorRepository,
    private scheduleRepo: IScheduleRepository,
    private upsertScheduleUseCase: UpsertScheduleUseCase,
    private createDoctorUseCase: CreateDoctorUseCase,
    private departmentRepo?: IDepartmentRepository,
    private userRepo?: IUserRepository,
    private auditLogRepo?: IAuditLogRepository
  ) {}

  getDoctors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const departmentId = req.query.departmentId as string | undefined;
      const doctors = await this.doctorRepo.findAll({
        departmentId,
        isActive: req.query.all === "true" ? undefined : true,
      });
      sendSuccess(res, "Doctors retrieved successfully", doctors);
    } catch (err) {
      next(err);
    }
  };

  getDoctorById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const doctor = await this.doctorRepo.findById(id);
      if (!doctor) {
        throw new AppError("Doctor not found.", 404);
      }
      sendSuccess(res, "Doctor retrieved successfully", doctor);
    } catch (err) {
      next(err);
    }
  };

  createDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doctor = await this.createDoctorUseCase.execute({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        departmentId: req.body.departmentId,
        specialization: req.body.specialization,
        qualification: req.body.qualification,
        experience: req.body.experience,
        phone: req.body.phone,
        creatorUserId: req.user!.userId,
        creatorRole: req.user!.role,
      });
      sendSuccess(res, "Doctor created successfully", doctor, 201);
    } catch (err) {
      next(err);
    }
  };

  updateDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const existingDoc = await this.doctorRepo.findById(id);
      if (!existingDoc) {
        throw new AppError("Doctor not found.", 404);
      }

      const { name, departmentId, specialization, qualification, experience, phone, isActive } =
        req.body;
      const updateData: Record<string, unknown> = {};

      if (departmentId !== undefined) {
        if (!this.departmentRepo) {
          throw new AppError("Department repository not available.", 500);
        }
        const dept = await this.departmentRepo.findById(departmentId);
        if (!dept || !dept.isActive) {
          throw new AppError("Specified department not found or is inactive.", 400);
        }
        updateData.departmentId = dept._id;
      }

      if (name !== undefined) {
        updateData.name = String(name).trim();
        if (this.userRepo && existingDoc.userId) {
          const userIdStr =
            typeof existingDoc.userId === "object" &&
            existingDoc.userId !== null &&
            "_id" in (existingDoc.userId as object)
              ? String((existingDoc.userId as { _id: unknown })._id)
              : String(existingDoc.userId);
          await this.userRepo.update(userIdStr, { name: String(name).trim() });
        }
      }

      if (specialization !== undefined) updateData.specialization = String(specialization).trim();
      if (qualification !== undefined) updateData.qualification = String(qualification).trim();
      if (experience !== undefined) updateData.experience = Number(experience);
      if (phone !== undefined) updateData.phone = String(phone).trim();
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      const updated = await this.doctorRepo.update(id, updateData);

      if (this.auditLogRepo && req.user) {
        await this.auditLogRepo.create({
          userId: req.user.userId,
          userRole: req.user.role,
          action: "DOCTOR_UPDATED",
          entity: "Doctor",
          entityId: id,
          details: { changes: updateData },
        });
      }

      sendSuccess(res, "Doctor updated successfully", updated);
    } catch (err) {
      next(err);
    }
  };

  getDoctorSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let id = String(req.params.id);
      if (req.user?.role === "doctor") {
        const doctorProfile = await this.doctorRepo.findByUserId(req.user.userId);
        if (!doctorProfile) {
          throw new AppError("Doctor profile not found for authenticated user.", 404);
        }
        if (id === "me" || id === doctorProfile._id.toString()) {
          id = doctorProfile._id.toString();
        } else {
          throw new AppError("Access denied: Doctors can only view their own schedule.", 403);
        }
      }

      const schedule = await this.scheduleRepo.findByDoctorId(id);
      if (!schedule) {
        throw new AppError("No schedule found for this doctor.", 404);
      }
      sendSuccess(res, "Schedule retrieved successfully", schedule);
    } catch (err) {
      next(err);
    }
  };

  upsertSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let id = String(req.params.id);
      if (req.user?.role === "doctor") {
        const doctorProfile = await this.doctorRepo.findByUserId(req.user.userId);
        if (!doctorProfile) {
          throw new AppError("Doctor profile not found for authenticated user.", 404);
        }
        if (id === "me" || id === doctorProfile._id.toString()) {
          id = doctorProfile._id.toString();
        } else {
          throw new AppError("Access denied: Doctors can only modify their own schedule.", 403);
        }
      }

      const schedule = await this.upsertScheduleUseCase.execute({
        doctorId: id,
        workingDays: req.body.workingDays,
        requestingUserId: req.user!.userId,
        requestingUserRole: req.user!.role,
      });
      sendSuccess(res, "Schedule updated successfully", schedule);
    } catch (err) {
      next(err);
    }
  };
}
