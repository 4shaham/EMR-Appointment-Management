import mongoose from "mongoose";
import { IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository";
import { IPatientRepository } from "../../repositories/interfaces/IPatientRepository";
import { IScheduleRepository } from "../../repositories/interfaces/IScheduleRepository";
import { IDoctorRepository } from "../../repositories/interfaces/IDoctorRepository";
import { IAuditLogRepository } from "../../repositories/interfaces/IAuditLogRepository";
import {
  generateSlots,
  filterPastSlots,
  getDayOfWeek,
} from "../../utils/slotGenerator";
import { AppError } from "../../utils/AppError";
import { UserRole } from "../../types";
import { getIO } from "../../config/socket";

interface NewPatientData {
  name: string;
  mobile: string;
  email?: string;
  age?: number;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  address?: string;
  bloodGroup?: string;
}

interface BookAppointmentInput {
  // Patient: either existing ID or new patient data
  patientId?: string;
  newPatient?: NewPatientData;

  doctorId: string;
  departmentId: string;
  appointmentDate: string; // "YYYY-MM-DD"
  slotTime: string;        // "HH:MM"
  purpose?: string;

  bookedBy: string;         // requesting user's ID
  bookedByRole: UserRole;
}

export class BookAppointmentUseCase {
  constructor(
    private appointmentRepo: IAppointmentRepository,
    private patientRepo: IPatientRepository,
    private scheduleRepo: IScheduleRepository,
    private doctorRepo: IDoctorRepository,
    private auditLogRepo: IAuditLogRepository
  ) {}

  async execute(input: BookAppointmentInput) {
    // ── 1. Validate date ────────────────────────────────────────────────────
    const appointmentDate = new Date(`${input.appointmentDate}T00:00:00.000Z`);
    if (isNaN(appointmentDate.getTime())) {
      throw new AppError("Invalid date format. Use YYYY-MM-DD.", 400);
    }

    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    if (appointmentDate < todayUTC) {
      throw new AppError("Cannot book appointments for past dates.", 400);
    }

    // ── 2. Validate doctor exists ───────────────────────────────────────────
    const doctor = await this.doctorRepo.findById(input.doctorId);
    if (!doctor || !doctor.isActive) {
      throw new AppError("Doctor not found or inactive.", 404);
    }

    // ── 3. Validate slot against schedule ──────────────────────────────────
    const schedule = await this.scheduleRepo.findByDoctorId(input.doctorId);
    if (!schedule || schedule.isActive === false) {
      throw new AppError("No active schedule found for this doctor.", 400);
    }

    const dayOfWeek = getDayOfWeek(appointmentDate);
    const daySchedule = schedule.workingDays.find((d) => d.day === dayOfWeek);
    if (!daySchedule) {
      throw new AppError(
        `Doctor does not work on ${dayOfWeek}s.`,
        400
      );
    }

    let validSlots = generateSlots(daySchedule);
    validSlots = filterPastSlots(validSlots, appointmentDate);

    if (!validSlots.includes(input.slotTime)) {
      throw new AppError(
        "The requested slot is not available (past, break period, or outside working hours).",
        400
      );
    }

    // ── 4. Resolve or create patient ────────────────────────────────────────
    let patient;
    if (input.patientId) {
      patient = await this.patientRepo.findById(input.patientId);
      if (!patient) {
        throw new AppError("Patient not found.", 404);
      }
    } else if (input.newPatient) {
      const nextId = await this.patientRepo.getNextPatientId();
      patient = await this.patientRepo.create({
        patientId: nextId,
        name: input.newPatient.name,
        mobile: input.newPatient.mobile,
        email: input.newPatient.email,
        age: input.newPatient.age,
        gender: input.newPatient.gender,
        address: input.newPatient.address,
        bloodGroup: input.newPatient.bloodGroup,
        dateOfBirth: input.newPatient.dateOfBirth
          ? new Date(input.newPatient.dateOfBirth)
          : undefined,
      });

      await this.auditLogRepo.create({
        userId: input.bookedBy,
        userRole: input.bookedByRole,
        action: "PATIENT_CREATED",
        entity: "Patient",
        entityId: patient._id.toString(),
        details: { patientId: patient.patientId },
      });
    } else {
      throw new AppError(
        "Either an existing patientId or newPatient data must be provided.",
        400
      );
    }

    // ── 5. Book the appointment (DB-level unique index prevents double-booking) ──
    let appointment;
    try {
      appointment = await this.appointmentRepo.create({
        patientId: new mongoose.Types.ObjectId(patient._id.toString()),
        doctorId: new mongoose.Types.ObjectId(input.doctorId),
        departmentId: new mongoose.Types.ObjectId(input.departmentId),
        appointmentDate,
        slotTime: input.slotTime,
        purpose: input.purpose,
        bookedBy: new mongoose.Types.ObjectId(input.bookedBy),
      });
    } catch (err: unknown) {
      // MongoDB duplicate key error code 11000
      if ((err as { code?: number }).code === 11000) {
        throw new AppError(
          "This slot has just been booked by another user. Please select a different slot.",
          409
        );
      }
      throw err;
    }

    // ── 6. Audit log ────────────────────────────────────────────────────────
    await this.auditLogRepo.create({
      userId: input.bookedBy,
      userRole: input.bookedByRole,
      action: "APPOINTMENT_CREATED",
      entity: "Appointment",
      entityId: appointment._id.toString(),
      details: {
        doctorId: input.doctorId,
        date: input.appointmentDate,
        slot: input.slotTime,
      },
    });

    // ── 7. Real-time notification ────────────────────────────────────────────
    try {
      const io = getIO();
      const room = `${input.doctorId}:${input.appointmentDate}`;
      io.to(room).emit("appointment:created", {
        appointmentId: appointment._id.toString(),
        doctorId: input.doctorId,
        date: input.appointmentDate,
        slotTime: input.slotTime,
      });
    } catch {
      // Socket.IO not initialized in tests/seeds — non-fatal
    }

    // Return populated appointment
    return this.appointmentRepo.findById(appointment._id.toString());
  }
}
