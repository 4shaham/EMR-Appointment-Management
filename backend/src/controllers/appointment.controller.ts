import { Request, Response, NextFunction } from "express";
import { BookAppointmentUseCase } from "../usecases/appointments/BookAppointmentUseCase";
import { ListAppointmentsUseCase } from "../usecases/appointments/ListAppointmentsUseCase";
import { UpdateAppointmentUseCase } from "../usecases/appointments/UpdateAppointmentUseCase";
import { CancelAppointmentUseCase } from "../usecases/appointments/CancelAppointmentUseCase";
import { MarkArrivedUseCase } from "../usecases/appointments/MarkArrivedUseCase";
import { CompleteAppointmentUseCase } from "../usecases/appointments/CompleteAppointmentUseCase";
import { IAppointmentRepository } from "../repositories/interfaces/IAppointmentRepository";
import { IDoctorRepository } from "../repositories/interfaces/IDoctorRepository";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";
import { AppointmentStatus } from "../types";

export class AppointmentController {
  constructor(
    private bookAppointmentUseCase: BookAppointmentUseCase,
    private listAppointmentsUseCase: ListAppointmentsUseCase,
    private updateAppointmentUseCase: UpdateAppointmentUseCase,
    private cancelAppointmentUseCase: CancelAppointmentUseCase,
    private markArrivedUseCase: MarkArrivedUseCase,
    private completeAppointmentUseCase: CompleteAppointmentUseCase,
    private appointmentRepo: IAppointmentRepository,
    private doctorRepo: IDoctorRepository
  ) {}

  book = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const appointment = await this.bookAppointmentUseCase.execute({
        ...req.body,
        bookedBy: req.user!.userId,
        bookedByRole: req.user!.role,
      });
      sendSuccess(res, "Appointment booked successfully", appointment, 201);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      let restrictToDoctorId: string | undefined;

      // If the requesting user is a doctor, find their doctor profile
      // and restrict results to their own appointments
      if (user.role === "doctor") {
        const doctorProfile = await this.doctorRepo.findByUserId(user.userId);
        if (!doctorProfile) {
          throw new AppError("Doctor profile not found.", 404);
        }
        restrictToDoctorId = doctorProfile._id.toString();
      }

      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
      const sortOrder = req.query.sortOrder as "asc" | "desc" | undefined;
      const doctorId = req.query.doctorId ? String(req.query.doctorId) : undefined;
      const departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
      const patientId = req.query.patientId ? String(req.query.patientId) : undefined;
      const status = req.query.status as AppointmentStatus | undefined;
      const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : undefined;
      const dateTo = req.query.dateTo ? String(req.query.dateTo) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const result = await this.listAppointmentsUseCase.execute({
        page,
        limit,
        sortBy,
        sortOrder,
        doctorId,
        departmentId,
        patientId,
        status,
        dateFrom,
        dateTo,
        search,
        restrictToDoctorId,
      });

      sendSuccess(res, "Appointments retrieved successfully", result.appointments, 200, result.meta);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const appointment = await this.appointmentRepo.findById(id);
      if (!appointment) {
        throw new AppError("Appointment not found", 404);
      }

      // If doctor role, ensure it's their appointment
      if (req.user!.role === "doctor") {
        const doctorProfile = await this.doctorRepo.findByUserId(req.user!.userId);
        const apptDoctorId = (appointment.doctorId as { _id?: unknown; toString(): string })._id
          ? (appointment.doctorId as { _id: { toString(): string } })._id.toString()
          : (appointment.doctorId as { toString(): string }).toString();

        if (!doctorProfile || doctorProfile._id.toString() !== apptDoctorId) {
          throw new AppError("Access denied to this appointment", 403);
        }
      }

      sendSuccess(res, "Appointment retrieved successfully", appointment);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      let restrictToDoctorUserId: string | undefined;

      if (user.role === "doctor") {
        const doctorProfile = await this.doctorRepo.findByUserId(user.userId);
        if (!doctorProfile) {
          throw new AppError("Doctor profile not found for authenticated user.", 404);
        }
        restrictToDoctorUserId = doctorProfile._id.toString();
      }

      const updated = await this.updateAppointmentUseCase.execute({
        appointmentId: String(req.params.id),
        purpose: req.body.purpose as string | undefined,
        notes: req.body.notes as string | undefined,
        requestingUserId: user.userId,
        requestingUserRole: user.role,
        restrictToDoctorUserId,
      });

      sendSuccess(res, "Appointment updated successfully", updated);
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cancelled = await this.cancelAppointmentUseCase.execute({
        appointmentId: String(req.params.id),
        cancelReason: req.body.cancelReason as string | undefined,
        requestingUserId: req.user!.userId,
        requestingUserRole: req.user!.role,
      });
      sendSuccess(res, "Appointment cancelled successfully", cancelled);
    } catch (err) {
      next(err);
    }
  };

  markArrived = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.markArrivedUseCase.execute({
        appointmentId: String(req.params.id),
        requestingUserId: req.user!.userId,
        requestingUserRole: req.user!.role,
      });
      sendSuccess(res, "Patient marked as arrived", updated);
    } catch (err) {
      next(err);
    }
  };

  complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user!;
      let restrictToDoctorUserId: string | undefined;

      if (user.role === "doctor") {
        const doctorProfile = await this.doctorRepo.findByUserId(user.userId);
        if (!doctorProfile) {
          throw new AppError("Doctor profile not found for authenticated user.", 404);
        }
        restrictToDoctorUserId = doctorProfile._id.toString();
      }

      const completed = await this.completeAppointmentUseCase.execute({
        appointmentId: String(req.params.id),
        notes: req.body.notes as string | undefined,
        requestingUserId: user.userId,
        requestingUserRole: user.role,
        restrictToDoctorUserId,
      });
      sendSuccess(res, "Appointment completed successfully", completed);
    } catch (err) {
      next(err);
    }
  };
}
