import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { CreateUserUseCase } from "../usecases/users/CreateUserUseCase";
import { UserRepository } from "../repositories/implementations/UserRepository";
import { AuditLogRepository } from "../repositories/implementations/AuditLogRepository";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { createUserSchema } from "../validators/user.validator";

const userRepo = new UserRepository();
const auditLogRepo = new AuditLogRepository();
const createUserUseCase = new CreateUserUseCase(userRepo, auditLogRepo);
const controller = new UserController(createUserUseCase, userRepo);

const router = Router();

router.use(authenticate);

// POST /api/v1/users — super_admin only (e.g. create receptionist)
router.post(
  "/",
  authorize("super_admin"),
  validate(createUserSchema),
  controller.createUser,
);

// GET /api/v1/users — super_admin only
router.get("/", authorize("super_admin"), controller.getUsers);

export default router;
