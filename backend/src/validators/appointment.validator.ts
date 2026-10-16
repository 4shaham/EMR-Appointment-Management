import { z } from "zod";

const newPatientSchema = z.object({
  name: z.string().min(1, "Patient name is required"),
  mobile: z
    .string()
    .regex(/^\d{10,15}$/, "Mobile number must be 10-15 digits"),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  age: z.number().int().positive().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
});

export const bookAppointmentSchema = z.object({
  body: z
    .object({
      patientId: z.string().optional(),
      newPatient: newPatientSchema.optional(),
      doctorId: z.string().min(1, "Doctor ID is required"),
      departmentId: z.string().min(1, "Department ID is required"),
      appointmentDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      slotTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Slot time must be in HH:MM format"),
      purpose: z.string().optional(),
    })
    .refine((data) => data.patientId || data.newPatient, {
      message: "Either patientId or newPatient data must be provided",
      path: ["patientId"],
    }),
});

export const updateAppointmentSchema = z.object({
  body: z.object({
    purpose: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const cancelAppointmentSchema = z.object({
  body: z.object({
    cancelReason: z.string().optional(),
  }),
});

export const listAppointmentsSchema = z.object({
  query: z.object({
    doctorId: z.string().optional(),
    departmentId: z.string().optional(),
    patientId: z.string().optional(),
    status: z
      .enum(["scheduled", "arrived", "completed", "cancelled"])
      .optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    search: z.string().optional(),
    page: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 10)),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const completeAppointmentSchema = z.object({
  body: z.object({
    notes: z.string().optional(),
  }),
});
