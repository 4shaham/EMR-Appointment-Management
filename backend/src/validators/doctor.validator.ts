import { z } from "zod";

const emptyStringToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

const phoneSchema = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z
    .string()
    .min(7, "Phone must be at least 7 digits")
    .max(15, "Phone cannot exceed 15 digits")
    .optional()
);

const experienceSchema = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
  z.number().int().nonnegative("Experience cannot be negative").optional()
);

export const createDoctorSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    departmentId: z.string().min(1, "Department is required"),
    specialization: z.string().min(2, "Specialization must be at least 2 characters"),
    qualification: emptyStringToUndefined,
    experience: experienceSchema,
    phone: phoneSchema,
  }),
});

export const updateDoctorSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
    departmentId: z.string().min(1, "Department must be valid").optional(),
    specialization: z.string().min(2, "Specialization must be at least 2 characters").optional(),
    qualification: emptyStringToUndefined,
    experience: experienceSchema,
    phone: phoneSchema,
    isActive: z.boolean().optional(),
  }),
});
