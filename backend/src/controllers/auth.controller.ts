import { Request, Response, NextFunction } from "express";
import { LoginUseCase } from "../usecases/auth/LoginUseCase";
import { LogoutUseCase } from "../usecases/auth/LogoutUseCase";
import { RefreshTokensUseCase } from "../usecases/auth/RefreshTokensUseCase";
import { IUserRepository } from "../repositories/interfaces/IUserRepository";
import { IDoctorRepository } from "../repositories/interfaces/IDoctorRepository";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";

export class AuthController {
  constructor(
    private loginUseCase: LoginUseCase,
    private logoutUseCase: LogoutUseCase,
    private refreshTokensUseCase: RefreshTokensUseCase,
    private userRepo: IUserRepository,
    private doctorRepo: IDoctorRepository
  ) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.loginUseCase.execute({
        email: req.body.email,
        password: req.body.password,
        ipAddress: req.ip,
      });
      sendSuccess(res, "Login successful", result, 200);
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.logoutUseCase.execute({
        refreshToken: req.body.refreshToken,
        userId: req.user!.userId,
        userRole: req.user!.role,
      });
      sendSuccess(res, "Logged out successfully");
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.refreshTokensUseCase.execute(
        req.body.refreshToken
      );
      sendSuccess(res, "Tokens refreshed successfully", result);
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userRepo.findById(req.user!.userId);
      if (!user) throw new AppError("User not found", 404);

      let doctorProfile = null;
      if (user.role === "doctor") {
        doctorProfile = await this.doctorRepo.findByUserId(user._id.toString());
      }

      sendSuccess(res, "Current user profile retrieved successfully", {
        user,
        doctorProfile,
      });
    } catch (err) {
      next(err);
    }
  };
}
