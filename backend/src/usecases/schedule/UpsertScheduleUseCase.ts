import { IScheduleRepository } from "../../repositories/interfaces/IScheduleRepository";
import { IDoctorRepository } from "../../repositories/interfaces/IDoctorRepository";
import { IDaySchedule } from "../../models/Schedule.model";
import { IAuditLogRepository } from "../../repositories/interfaces/IAuditLogRepository";
import { AppointmentModel } from "../../models/Appointment.model";
import { getDayOfWeek, generateSlots } from "../../utils/slotGenerator";
import { AppError } from "../../utils/AppError";
import { UserRole } from "../../types";
import { getIO } from "../../config/socket";

interface UpsertScheduleInput {
  doctorId: string;
  workingDays: IDaySchedule[];
  requestingUserId: string;
  requestingUserRole: UserRole;
}

export class UpsertScheduleUseCase {
  constructor(
    private scheduleRepo: IScheduleRepository,
    private doctorRepo: IDoctorRepository,
    private auditLogRepo: IAuditLogRepository
  ) {}

  async execute(input: UpsertScheduleInput) {
    const doctor = await this.doctorRepo.findById(input.doctorId);
    if (!doctor) {
      throw new AppError("Doctor not found", 404);
    }

    // ── Check for conflicting existing appointments ───────────────────────────
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    const activeAppointments = await AppointmentModel.find({
      doctorId: doctor._id,
      appointmentDate: { $gte: todayUTC },
      status: { $in: ["scheduled", "arrived"] },
    })
      .populate("patientId", "name patientId")
      .lean();

    for (const appt of activeAppointments) {
      const apptDate = new Date(appt.appointmentDate);
      const dayName = getDayOfWeek(apptDate);
      const daySched = input.workingDays.find((d) => d.day === dayName);
      const dateStr = apptDate.toISOString().split("T")[0];
      const patient = appt.patientId as { name?: string; patientId?: string } | null;
      const patientInfo = patient?.name ? ` for patient "${patient.name}"` : "";

      if (!daySched) {
        throw new AppError(
          `Schedule update conflicts with an existing ${appt.status} appointment on ${dateStr} at ${appt.slotTime}${patientInfo}. The doctor has no working sessions on ${dayName}. Please reschedule or cancel the appointment first.`,
          400
        );
      }

      const availableSlots = generateSlots(daySched);
      if (!availableSlots.includes(appt.slotTime)) {
        throw new AppError(
          `Schedule update conflicts with an existing ${appt.status} appointment on ${dateStr} at ${appt.slotTime}${patientInfo}. The slot falls outside working hours or inside a break period. Please reschedule or cancel the appointment first.`,
          400
        );
      }
    }

    const schedule = await this.scheduleRepo.upsert(input.doctorId, {
      workingDays: input.workingDays,
      isActive: true,
    });

    await this.auditLogRepo.create({
      userId: input.requestingUserId,
      userRole: input.requestingUserRole,
      action: "SCHEDULE_UPDATED",
      entity: "Schedule",
      entityId: schedule._id.toString(),
      details: { doctorId: input.doctorId },
    });

    try {
      const io = getIO();
      if (io) {
        io.emit("schedule:updated", { doctorId: input.doctorId });
      }
    } catch (_) {
      // ignore socket emission failure if disconnected
    }

    return schedule;
  }
}
