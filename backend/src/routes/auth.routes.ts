import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
} from "../validators/auth.validator";

// Dependency injection
import { UserRepository } from "../repositories/implementations/UserRepository";
import { RefreshTokenRepository } from "../repositories/implementations/RefreshTokenRepository";
import { AuditLogRepository } from "../repositories/implementations/AuditLogRepository";
import { DoctorRepository } from "../repositories/implementations/DoctorRepository";
import { LoginUseCase } from "../usecases/auth/LoginUseCase";
import { LogoutUseCase } from "../usecases/auth/LogoutUseCase";
import { RefreshTokensUseCase } from "../usecases/auth/RefreshTokensUseCase";

const userRepo = new UserRepository();
const refreshTokenRepo = new RefreshTokenRepository();
const auditLogRepo = new AuditLogRepository();
const doctorRepo = new DoctorRepository();

const loginUseCase = new LoginUseCase(userRepo, refreshTokenRepo, auditLogRepo);
const logoutUseCase = new LogoutUseCase(refreshTokenRepo, auditLogRepo, userRepo);
const refreshTokensUseCase = new RefreshTokensUseCase(refreshTokenRepo);

const controller = new AuthController(
  loginUseCase,
  logoutUseCase,
  refreshTokensUseCase,
  userRepo,
  doctorRepo
);

const router = Router();

router.post("/login", validate(loginSchema), controller.login);
router.post("/logout", authenticate, validate(logoutSchema), controller.logout);
router.post("/refresh", validate(refreshSchema), controller.refresh);
router.get("/me", authenticate, controller.me);

export default router;
