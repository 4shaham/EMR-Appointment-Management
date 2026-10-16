import { IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository";
import { IAuditLogRepository } from "../../repositories/interfaces/IAuditLogRepository";
import { AppError } from "../../utils/AppError";
import { UserRole } from "../../types";
import { getIO } from "../../config/socket";
import { extractEntityId } from "../../utils/entityId";

interface UpdateAppointmentInput {
  appointmentId: string;
  purpose?: string;
  notes?: string;
  requestingUserId: string;
  requestingUserRole: UserRole;
  // Doctors can only update their own appointments
  restrictToDoctorUserId?: string;
}

export class UpdateAppointmentUseCase {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private auditLogRepo: IAuditLogRepository
  ) {}

  async execute(input: UpdateAppointmentInput) {
    const existing = await this.appointmentRepo.findById(input.appointmentId);
    if (!existing) {
      throw new AppError("Appointment not found.", 404);
    }

    if (existing.status === "cancelled") {
      throw new AppError("Cannot update a cancelled appointment.", 400);
    }

    const doctorId = extractEntityId(existing.doctorId);

    // Doctors can only update notes on their own appointments
    if (input.restrictToDoctorUserId) {
      if (doctorId !== input.restrictToDoctorUserId) {
        throw new AppError(
          "You can only update your own appointments.",
          403
        );
      }
    }

    const updateData: { purpose?: string; notes?: string } = {};
    if (input.purpose !== undefined) updateData.purpose = input.purpose;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const updated = await this.appointmentRepo.update(
      input.appointmentId,
      updateData
    );

    await this.auditLogRepo.create({
      userId: input.requestingUserId,
      userRole: input.requestingUserRole,
      action: "APPOINTMENT_UPDATED",
      entity: "Appointment",
      entityId: input.appointmentId,
      details: updateData,
    });

    // Real-time notification
    try {
      const io = getIO();
      const dateStr = existing.appointmentDate.toISOString().split("T")[0];
      const room = `${doctorId}:${dateStr}`;
      const payload = {
        appointmentId: input.appointmentId,
        status: existing.status,
        doctorId,
        appointmentDate: dateStr,
      };
      io.to(room).emit("appointment:updated", payload);
      io.emit("appointment:updated", payload);
    } catch {
      // Non-fatal
    }

    return updated;
  }
}
