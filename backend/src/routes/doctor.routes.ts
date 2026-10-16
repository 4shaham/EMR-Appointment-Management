import { Router } from "express";
import { DoctorController } from "../controllers/doctor.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { upsertScheduleSchema } from "../validators/schedule.validator";
import { createDoctorSchema, updateDoctorSchema } from "../validators/doctor.validator";

import { DoctorRepository } from "../repositories/implementations/DoctorRepository";
import { ScheduleRepository } from "../repositories/implementations/ScheduleRepository";
import { AuditLogRepository } from "../repositories/implementations/AuditLogRepository";
import { UserRepository } from "../repositories/implementations/UserRepository";
import { DepartmentRepository } from "../repositories/implementations/DepartmentRepository";
import { UpsertScheduleUseCase } from "../usecases/schedule/UpsertScheduleUseCase";
import { CreateDoctorUseCase } from "../usecases/doctors/CreateDoctorUseCase";

const doctorRepo = new DoctorRepository();
const scheduleRepo = new ScheduleRepository();
const auditLogRepo = new AuditLogRepository();
const userRepo = new UserRepository();
const departmentRepo = new DepartmentRepository();

const upsertScheduleUseCase = new UpsertScheduleUseCase(
  scheduleRepo,
  doctorRepo,
  auditLogRepo,
);

const createDoctorUseCase = new CreateDoctorUseCase(
  doctorRepo,
  userRepo,
  departmentRepo,
  auditLogRepo,
);

const controller = new DoctorController(
  doctorRepo,
  scheduleRepo,
  upsertScheduleUseCase,
  createDoctorUseCase,
  departmentRepo,
  userRepo,
  auditLogRepo,
);

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/doctors — accessible by all authenticated roles
router.get("/", controller.getDoctors);

// GET /api/v1/doctors/:id — accessible by all authenticated roles
router.get("/:id", controller.getDoctorById);

// POST /api/v1/doctors — super_admin only (creates user + doctor profile)
router.post(
  "/",
  authorize("super_admin"),
  validate(createDoctorSchema),
  controller.createDoctor,
);

// PUT /api/v1/doctors/:id — super_admin only (update doctor profile & department)
router.put(
  "/:id",
  authorize("super_admin"),
  validate(updateDoctorSchema),
  controller.updateDoctor,
);

// GET /api/v1/doctors/:id/schedule — accessible by all authenticated roles
router.get("/:id/schedule", controller.getDoctorSchedule);

// PUT /api/v1/doctors/:id/schedule — super_admin and doctor (doctors restricted to own schedule)
router.put(
  "/:id/schedule",
  authorize("super_admin", "doctor"),
  validate(upsertScheduleSchema),
  controller.upsertSchedule,
);

export default router;
