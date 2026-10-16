import { z } from "zod";
import { timeToMinutes, minutesToTime } from "../utils/slotGenerator";

const timeRangeSchema = z
  .object({
    start: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    end: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  })
  .refine((val) => timeToMinutes(val.start) < timeToMinutes(val.end), {
    message: "Start time must be strictly before end time",
    path: ["start"],
  });

const sessionSchema = timeRangeSchema.and(
  z.object({
    label: z.string().optional(),
  })
);

const dayScheduleSchema = z
  .object({
    day: z.enum([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]),
    sessions: z.array(sessionSchema).min(1, "At least one session is required"),
    breaks: z.array(timeRangeSchema).default([]),
    slotDurationMinutes: z
      .number()
      .int()
      .min(5, "Minimum slot duration is 5 minutes"),
  })
  .superRefine((data, ctx) => {
    // 1. Validate that each working session is at least slotDurationMinutes long
    for (let sIdx = 0; sIdx < data.sessions.length; sIdx++) {
      const sess = data.sessions[sIdx];
      const dur = timeToMinutes(sess.end) - timeToMinutes(sess.start);
      if (dur < data.slotDurationMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Working session (${sess.start} - ${sess.end}) duration must be at least ${data.slotDurationMinutes} minutes (the slot duration).`,
          path: ["sessions", sIdx],
        });
      }
    }

    // 2. Validate that working sessions do not overlap each other
    const sortedSessions = [...data.sessions].sort(
      (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
    );

    for (let i = 0; i < sortedSessions.length - 1; i++) {
      const current = sortedSessions[i];
      const next = sortedSessions[i + 1];
      if (timeToMinutes(current.end) > timeToMinutes(next.start)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Working sessions overlap: (${current.start}-${current.end}) and (${next.start}-${next.end})`,
          path: ["sessions"],
        });
      }
    }

    // 3. Validate that break periods do not overlap each other
    const sortedBreaks = [...data.breaks].sort(
      (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
    );

    for (let i = 0; i < sortedBreaks.length - 1; i++) {
      const current = sortedBreaks[i];
      const next = sortedBreaks[i + 1];
      if (timeToMinutes(current.end) > timeToMinutes(next.start)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Breaks overlap: (${current.start}-${current.end}) and (${next.start}-${next.end})`,
          path: ["breaks"],
        });
      }
    }

    // 4. Validate that each break falls within the overall daily working hours
    if (data.sessions.length > 0 && data.breaks.length > 0) {
      const earliestStart = sortedSessions[0].start;
      const latestEnd = sortedSessions[sortedSessions.length - 1].end;
      const earliestStartMin = timeToMinutes(earliestStart);
      const latestEndMin = timeToMinutes(latestEnd);

      for (let bIdx = 0; bIdx < data.breaks.length; bIdx++) {
        const brk = data.breaks[bIdx];
        const bStart = timeToMinutes(brk.start);
        const bEnd = timeToMinutes(brk.end);

        if (bStart < earliestStartMin || bEnd > latestEndMin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Break (${brk.start} - ${brk.end}) must fall within working hours (${earliestStart} - ${latestEnd}) on ${data.day.toUpperCase()}.`,
            path: ["breaks", bIdx],
          });
        }
      }
    }
  });

export const upsertScheduleSchema = z.object({
  body: z.object({
    workingDays: z
      .array(dayScheduleSchema)
      .min(1, "At least one working day is required")
      .refine(
        (days) => {
          const daySet = new Set(days.map((d) => d.day));
          return daySet.size === days.length;
        },
        {
          message: "Each day can only be configured once in a schedule.",
        }
      ),
  }),
});

export type UpsertScheduleInput = z.infer<typeof upsertScheduleSchema>["body"];
