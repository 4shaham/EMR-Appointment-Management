import { z } from "zod";

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Department name must be at least 2 characters")
      .max(100, "Department name cannot exceed 100 characters"),
    description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateDepartmentSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Department name must be at least 2 characters")
      .max(100, "Department name cannot exceed 100 characters")
      .optional(),
    description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional(),
    isActive: z.boolean().optional(),
  }),
});
