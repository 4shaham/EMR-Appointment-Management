import { IDaySchedule, ITimeRange } from "../models/Schedule.model";
import { DayOfWeek } from "../types";

/**
 * Convert "HH:MM" string to total minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert total minutes since midnight to "HH:MM" string.
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Returns true if a slot period [slotStartMin, slotStartMin + slotDurationMinutes]
 * overlaps with any break period [breakStart, breakEnd].
 */
export function slotOverlapsBreak(
  slotStartMin: number,
  slotDurationMinutes: number,
  breaks: ITimeRange[]
): boolean {
  const slotEndMin = slotStartMin + slotDurationMinutes;
  return breaks.some((b) => {
    const breakStart = timeToMinutes(b.start);
    const breakEnd = timeToMinutes(b.end);
    return slotStartMin < breakEnd && slotEndMin > breakStart;
  });
}

/**
 * Get the day-of-week name for a given JS Date (UTC).
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[date.getUTCDay()];
}

/**
 * Generate all appointment slots for a given day schedule.
 * Slots are generated within every working interval (session),
 * excluding any slot that overlaps a break.
 * Returns a sorted array of unique "HH:MM" slot start times.
 */
export function generateSlots(daySchedule: IDaySchedule): string[] {
  const slots: string[] = [];
  const { sessions, breaks, slotDurationMinutes } = daySchedule;

  for (const session of sessions) {
    const sessionStart = timeToMinutes(session.start);
    const sessionEnd = timeToMinutes(session.end);

    let current = sessionStart;
    while (current + slotDurationMinutes <= sessionEnd) {
      if (!slotOverlapsBreak(current, slotDurationMinutes, breaks)) {
        slots.push(minutesToTime(current));
      }
      current += slotDurationMinutes;
    }
  }

  return Array.from(new Set(slots)).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

/**
 * Check if a specific slot time is in the past for a given appointmentDate.
 */
export function isPastSlot(slotTime: string, appointmentDate: Date): boolean {
  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const apptUTC = new Date(
    Date.UTC(
      appointmentDate.getUTCFullYear(),
      appointmentDate.getUTCMonth(),
      appointmentDate.getUTCDate()
    )
  );

  if (apptUTC < todayUTC) return true;
  if (apptUTC > todayUTC) return false;

  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return timeToMinutes(slotTime) <= nowMinutes;
}

/**
 * Filter out past slots for today's date.
 * If appointmentDate is today, remove slots whose time has already passed.
 */
export function filterPastSlots(slots: string[], appointmentDate: Date): string[] {
  return slots.filter((slot) => !isPastSlot(slot, appointmentDate));
}
