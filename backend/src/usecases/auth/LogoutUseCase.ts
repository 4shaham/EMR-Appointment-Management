import { IRefreshTokenRepository } from "../../repositories/interfaces/IRefreshTokenRepository";
import { IAuditLogRepository } from "../../repositories/interfaces/IAuditLogRepository";
import { IUserRepository } from "../../repositories/interfaces/IUserRepository";
import { AppError } from "../../utils/AppError";
import { UserRole } from "../../types";

interface LogoutInput {
  refreshToken: string;
  userId: string;
  userRole: UserRole;
}

export class LogoutUseCase {
  constructor(
    private refreshTokenRepo: IRefreshTokenRepository,
    private auditLogRepo: IAuditLogRepository,
    private userRepo: IUserRepository
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const tokenDoc = await this.refreshTokenRepo.findByToken(input.refreshToken);
    if (!tokenDoc) {
      throw new AppError("Refresh token not found or already invalidated", 400);
    }

    await this.refreshTokenRepo.deleteByToken(input.refreshToken);

    await this.auditLogRepo.create({
      userId: input.userId,
      userRole: input.userRole,
      action: "LOGOUT",
      entity: "User",
      entityId: input.userId,
    });
  }
}
