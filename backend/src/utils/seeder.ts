import { UserModel } from "../models/User.model";

/**
 * Idempotently seeds default system accounts, departments, doctors, and schedules.
 * Ensures the system is always operational out of the box after any DB reset.
 */
export async function seedDefaultAccounts(): Promise<void> {
  // ── 2. Super Admin ──────────────────────────────────────────────────────────
  const existingAdmin = await UserModel.findOne({
    $or: [{ email: "admin@emr.com" }, { role: "super_admin" }],
  });

  if (!existingAdmin) {
    await UserModel.create({
      name: "System Admin",
      email: "admin@emr.com",
      password: "Admin@1234",
      role: "super_admin",
      isActive: true,
    });
    console.log("[Seed] Created Super Admin: admin@emr.com / Admin@1234");
  }
}
