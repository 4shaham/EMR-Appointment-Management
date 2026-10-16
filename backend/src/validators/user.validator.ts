import { z } from "zod";

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    // Only receptionist or super_admin accounts can be created via /users endpoint.
    // Doctor accounts must be created via POST /doctors (which also creates a Doctor profile).
    role: z.enum(["receptionist", "super_admin"]),
  }),
});

export type CreateUserSchemaInput = z.infer<typeof createUserSchema>["body"];
