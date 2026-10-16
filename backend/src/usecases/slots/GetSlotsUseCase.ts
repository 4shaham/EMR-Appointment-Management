import { IScheduleRepository } from "../../repositories/interfaces/IScheduleRepository";
import { IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository";
import { IDoctorRepository } from "../../repositories/interfaces/IDoctorRepository";
import {
  generateSlots,
  isPastSlot,
  getDayOfWeek,
} from "../../utils/slotGenerator";
import { AppError } from "../../utils/AppError";

interface GetSlotsInput {
  doctorId: string;
  date: string; // "YYYY-MM-DD"
  departmentId?: string;
}

interface SlotInfo {
  time: string;
  isBooked: boolean;
  isAvailable: boolean;
  isPast: boolean;
}

interface GetSlotsResult {
  doctor: unknown;
  date: string;
  slots: SlotInfo[];
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
}

export class GetSlotsUseCase {
  constructor(
    private scheduleRepo: IScheduleRepository,
    private appointmentRepo: IAppointmentRepository,
    private doctorRepo: IDoctorRepository
  ) {}

  async execute(input: GetSlotsInput): Promise<GetSlotsResult> {
    // Parse and validate date
    const appointmentDate = new Date(`${input.date}T00:00:00.000Z`);
    if (isNaN(appointmentDate.getTime())) {
      throw new AppError("Invalid date format. Use YYYY-MM-DD.", 400);
    }

    // Reject past dates
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    if (appointmentDate < todayUTC) {
      throw new AppError("Cannot view slots for past dates.", 400);
    }

    const doctor = await this.doctorRepo.findById(input.doctorId);
    if (!doctor) {
      throw new AppError("Doctor not found", 404);
    }

    // If departmentId filter provided, verify doctor is in that department
    if (input.departmentId) {
      const docDeptId =
        typeof doctor.departmentId === "object" && doctor.departmentId !== null
          ? ((doctor.departmentId as { _id?: unknown })._id?.toString() ||
              (doctor.departmentId as { toString(): string }).toString())
          : String(doctor.departmentId);
      if (docDeptId !== input.departmentId) {
        return {
          doctor,
          date: input.date,
          slots: [],
          totalSlots: 0,
          availableSlots: 0,
          bookedSlots: 0,
        };
      }
    }

    const schedule = await this.scheduleRepo.findByDoctorId(input.doctorId);
    if (!schedule || schedule.isActive === false) {
      throw new AppError("No active schedule found for this doctor.", 404);
    }

    const dayOfWeek = getDayOfWeek(appointmentDate);
    const daySchedule = schedule.workingDays.find((d) => d.day === dayOfWeek);

    if (!daySchedule) {
      return {
        doctor,
        date: input.date,
        slots: [],
        totalSlots: 0,
        availableSlots: 0,
        bookedSlots: 0,
      };
    }

    // Generate all slots from schedule
    const allSlots = generateSlots(daySchedule);

    // Get already booked slots from DB
    const bookedSlotTimes = await this.appointmentRepo.findBookedSlots(
      input.doctorId,
      appointmentDate
    );

    const bookedSet = new Set(bookedSlotTimes);

    const slots: SlotInfo[] = allSlots.map((time) => {
      const isBooked = bookedSet.has(time);
      const isPast = isPastSlot(time, appointmentDate);
      return {
        time,
        isBooked,
        isPast,
        isAvailable: !isBooked && !isPast,
      };
    });

    return {
      doctor,
      date: input.date,
      slots,
      totalSlots: slots.length,
      availableSlots: slots.filter((s) => s.isAvailable).length,
      bookedSlots: slots.filter((s) => s.isBooked).length,
    };
  }
}
