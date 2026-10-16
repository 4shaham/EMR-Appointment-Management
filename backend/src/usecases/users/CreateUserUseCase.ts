import { IUserRepository } from "../../repositories/interfaces/IUserRepository";
import { IAuditLogRepository } from "../../repositories/interfaces/IAuditLogRepository";
import { AppError } from "../../utils/AppError";
import { UserRole } from "../../types";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  creatorUserId: string;
  creatorRole: UserRole;
}

export class CreateUserUseCase {
  constructor(
    private userRepo: IUserRepository,
    private auditLogRepo: IAuditLogRepository
  ) {}

  async execute(input: CreateUserInput) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await this.userRepo.findByEmail(normalizedEmail);
    if (existing) {
      throw new AppError(`A user with email "${normalizedEmail}" already exists.`, 409);
    }

    const user = await this.userRepo.create({
      name: input.name.trim(),
      email: normalizedEmail,
      password: input.password,
      role: input.role,
    });

    await this.auditLogRepo.create({
      userId: input.creatorUserId,
      userRole: input.creatorRole,
      action: "USER_CREATED",
      entity: "User",
      entityId: user._id.toString(),
      details: {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    return user;
  }
}
