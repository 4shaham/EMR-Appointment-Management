import { IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository";
import { IAuditLogRepository } from "../../repositories/interfaces/IAuditLogRepository";
import { AppError } from "../../utils/AppError";
import { UserRole } from "../../types";
import { getIO } from "../../config/socket";
import { extractEntityId } from "../../utils/entityId";

interface MarkArrivedInput {
  appointmentId: string;
  requestingUserId: string;
  requestingUserRole: UserRole;
}

export class MarkArrivedUseCase {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private auditLogRepo: IAuditLogRepository
  ) {}

  async execute(input: MarkArrivedInput) {
    const existing = await this.appointmentRepo.findById(input.appointmentId);
    if (!existing) {
      throw new AppError("Appointment not found.", 404);
    }

    if (existing.status !== "scheduled") {
      throw new AppError(
        `Cannot mark as arrived. Current status is '${existing.status}'.`,
        400
      );
    }

    const updated = await this.appointmentRepo.update(input.appointmentId, {
      status: "arrived",
      arrivedAt: new Date(),
    });

    await this.auditLogRepo.create({
      userId: input.requestingUserId,
      userRole: input.requestingUserRole,
      action: "APPOINTMENT_ARRIVED",
      entity: "Appointment",
      entityId: input.appointmentId,
    });

    // Real-time notification
    try {
      const io = getIO();
      const dateStr = existing.appointmentDate.toISOString().split("T")[0];
      const doctorId = extractEntityId(existing.doctorId);
      const payload = {
        appointmentId: input.appointmentId,
        slotTime: existing.slotTime,
        status: "arrived",
        doctorId,
        appointmentDate: dateStr,
      };
      io.to(`${doctorId}:${dateStr}`).emit("appointment:arrived", payload);
      io.emit("appointment:arrived", payload);
      io.emit("appointment:updated", payload);
    } catch {
      // Non-fatal
    }

    return updated;
  }
}
