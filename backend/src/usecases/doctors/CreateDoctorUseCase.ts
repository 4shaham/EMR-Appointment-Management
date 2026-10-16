import mongoose from "mongoose";
import { IDoctorRepository } from "../../repositories/interfaces/IDoctorRepository";
import { IUserRepository } from "../../repositories/interfaces/IUserRepository";
import { IDepartmentRepository } from "../../repositories/interfaces/IDepartmentRepository";
import { IAuditLogRepository } from "../../repositories/interfaces/IAuditLogRepository";
import { AppError } from "../../utils/AppError";
import { UserRole } from "../../types";

export interface CreateDoctorInput {
  name: string;
  email: string;
  password: string;
  departmentId: string;
  specialization: string;
  qualification?: string;
  experience?: number;
  phone?: string;
  creatorUserId: string;
  creatorRole: UserRole;
}

export class CreateDoctorUseCase {
  constructor(
    private doctorRepo: IDoctorRepository,
    private userRepo: IUserRepository,
    private departmentRepo: IDepartmentRepository,
    private auditLogRepo: IAuditLogRepository
  ) {}

  async execute(input: CreateDoctorInput) {
    // 1. Check if user with this email already exists
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) {
      throw new AppError("A user with this email already exists.", 409);
    }

    // 2. Check if department exists
    const department = await this.departmentRepo.findById(input.departmentId);
    if (!department || !department.isActive) {
      throw new AppError("Department not found or inactive.", 404);
    }

    // 3. Create the User account
    const user = await this.userRepo.create({
      name: input.name,
      email: input.email.toLowerCase().trim(),
      password: input.password,
      role: "doctor",
    });

    // 4. Create the Doctor profile linked to user and department
    const doctor = await this.doctorRepo.create({
      userId: user._id,
      departmentId: new mongoose.Types.ObjectId(input.departmentId),
      name: input.name.trim(),
      specialization: input.specialization.trim(),
      qualification: input.qualification?.trim(),
      experience: input.experience,
      phone: input.phone?.trim(),
      isActive: true,
    });

    // 5. Audit log
    await this.auditLogRepo.create({
      userId: input.creatorUserId,
      userRole: input.creatorRole,
      action: "DOCTOR_CREATED",
      entity: "Doctor",
      entityId: doctor._id.toString(),
      details: {
        doctorId: doctor._id.toString(),
        name: doctor.name,
        email: input.email,
        departmentId: input.departmentId,
      },
    });

    return this.doctorRepo.findById(doctor._id.toString());
  }
}
