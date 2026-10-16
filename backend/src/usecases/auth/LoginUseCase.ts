import { IUserRepository } from "../../repositories/interfaces/IUserRepository";
import { IRefreshTokenRepository } from "../../repositories/interfaces/IRefreshTokenRepository";
import { IAuditLogRepository } from "../../repositories/interfaces/IAuditLogRepository";
import {
  signAccessToken,
  signRefreshToken,
  getRefreshTokenExpiry,
  verifyRefreshToken,
} from "../../utils/jwt";
import { AppError } from "../../utils/AppError";

interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export class LoginUseCase {
  constructor(
    private userRepo: IUserRepository,
    private refreshTokenRepo: IRefreshTokenRepository,
    private auditLogRepo: IAuditLogRepository
  ) {}

  async execute(input: LoginInput): Promise<AuthTokens> {
    // First find by email (without password field)
    const emailLookup = await this.userRepo.findByEmail(input.email);
    if (!emailLookup) {
      throw new AppError("Invalid email or password", 401);
    }

    if (!emailLookup.isActive) {
      throw new AppError("Account is deactivated. Contact administrator.", 403);
    }

    // Re-fetch with password field included for comparison
    const user = await this.userRepo.findByIdWithPassword(
      emailLookup._id.toString()
    );

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const isPasswordValid = await user.comparePassword(input.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    const payload = { userId: user._id.toString(), role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await this.refreshTokenRepo.create(
      user._id.toString(),
      refreshToken,
      getRefreshTokenExpiry()
    );

    // Audit log
    await this.auditLogRepo.create({
      userId: user._id.toString(),
      userRole: user.role,
      action: "LOGIN",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: input.ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
