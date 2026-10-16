import { IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository";
import { IAuditLogRepository } from "../../repositories/interfaces/IAuditLogRepository";
import { AppError } from "../../utils/AppError";
import { UserRole } from "../../types";
import { getIO } from "../../config/socket";
import { extractEntityId } from "../../utils/entityId";

interface CompleteAppointmentInput {
  appointmentId: string;
  notes?: string;
  requestingUserId: string;
  requestingUserRole: UserRole;
  restrictToDoctorUserId?: string;
}

export class CompleteAppointmentUseCase {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private auditLogRepo: IAuditLogRepository
  ) {}

  async execute(input: CompleteAppointmentInput) {
    const existing = await this.appointmentRepo.findById(input.appointmentId);
    if (!existing) {
      throw new AppError("Appointment not found.", 404);
    }

    if (existing.status === "completed") {
      throw new AppError("Appointment is already completed.", 400);
    }

    if (existing.status === "cancelled") {
      throw new AppError("Cannot complete a cancelled appointment.", 400);
    }

    if (existing.status !== "arrived" && existing.status !== "scheduled") {
      throw new AppError(
        `Cannot mark as completed. Current status is '${existing.status}'. Only arrived or scheduled appointments can be completed.`,
        400
      );
    }

    const doctorId = extractEntityId(existing.doctorId);

    if (input.restrictToDoctorUserId) {
      if (doctorId !== input.restrictToDoctorUserId) {
        throw new AppError("You can only complete your own appointments.", 403);
      }
    }

    const updateData: {
      status: "completed";
      completedAt: Date;
      arrivedAt?: Date;
      notes?: string;
    } = {
      status: "completed",
      completedAt: new Date(),
      arrivedAt: existing.arrivedAt || new Date(),
    };
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    const updated = await this.appointmentRepo.update(input.appointmentId, updateData);

    await this.auditLogRepo.create({
      userId: input.requestingUserId,
      userRole: input.requestingUserRole,
      action: "APPOINTMENT_COMPLETED",
      entity: "Appointment",
      entityId: input.appointmentId,
      details: updateData,
    });

    try {
      const io = getIO();
      const dateStr = existing.appointmentDate.toISOString().split("T")[0];
      const room = `${doctorId}:${dateStr}`;
      const payload = {
        appointmentId: input.appointmentId,
        slotTime: existing.slotTime,
        status: "completed",
        doctorId,
        appointmentDate: dateStr,
      };

      io.to(room).emit("appointment:completed", payload);
      io.emit("appointment:completed", payload);
      io.emit("appointment:updated", payload);
    } catch {
      // Non-fatal
    }

    return updated;
  }
}
