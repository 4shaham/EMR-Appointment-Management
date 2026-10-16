import { IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository";
import { IAuditLogRepository } from "../../repositories/interfaces/IAuditLogRepository";
import { AppError } from "../../utils/AppError";
import { UserRole } from "../../types";
import { getIO } from "../../config/socket";
import { extractEntityId } from "../../utils/entityId";

interface CancelAppointmentInput {
  appointmentId: string;
  cancelReason?: string;
  requestingUserId: string;
  requestingUserRole: UserRole;
}

export class CancelAppointmentUseCase {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private auditLogRepo: IAuditLogRepository
  ) {}

  async execute(input: CancelAppointmentInput) {
    const existing = await this.appointmentRepo.findById(input.appointmentId);
    if (!existing) {
      throw new AppError("Appointment not found.", 404);
    }

    if (existing.status === "cancelled") {
      throw new AppError("Appointment is already cancelled.", 400);
    }

    if (existing.status === "completed") {
      throw new AppError("Cannot cancel a completed appointment.", 400);
    }

    const cancelled = await this.appointmentRepo.softDelete(
      input.appointmentId,
      input.cancelReason
    );

    await this.auditLogRepo.create({
      userId: input.requestingUserId,
      userRole: input.requestingUserRole,
      action: "APPOINTMENT_CANCELLED",
      entity: "Appointment",
      entityId: input.appointmentId,
      details: { reason: input.cancelReason },
    });

    // Real-time notification
    try {
      const io = getIO();
      const dateStr = existing.appointmentDate.toISOString().split("T")[0];
      const doctorId = extractEntityId(existing.doctorId);
      const payload = {
        appointmentId: input.appointmentId,
        slotTime: existing.slotTime,
        status: "cancelled",
        doctorId,
        appointmentDate: dateStr,
      };
      io.to(`${doctorId}:${dateStr}`).emit("appointment:cancelled", payload);
      io.emit("appointment:cancelled", payload);
      io.emit("appointment:updated", payload);
    } catch {
      // Non-fatal
    }

    return cancelled;
  }
}
