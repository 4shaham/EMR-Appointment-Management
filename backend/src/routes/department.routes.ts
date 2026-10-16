import { Router } from "express";
import { DepartmentController } from "../controllers/department.controller";
import { DepartmentRepository } from "../repositories/implementations/DepartmentRepository";
import { AuditLogRepository } from "../repositories/implementations/AuditLogRepository";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../validators/department.validator";

const departmentRepo = new DepartmentRepository();
const auditLogRepo = new AuditLogRepository();
const controller = new DepartmentController(departmentRepo, auditLogRepo);

const router = Router();

// All department operations require authentication
router.use(authenticate);

// GET /api/v1/departments — all authenticated users (needed for dropdowns & scheduler)
router.get("/", controller.getAll);

// GET /api/v1/departments/:id — all authenticated users
router.get("/:id", controller.getById);

// POST /api/v1/departments — super_admin only
router.post(
  "/",
  authorize("super_admin"),
  validate(createDepartmentSchema),
  controller.create
);

// PUT /api/v1/departments/:id — super_admin only
router.put(
  "/:id",
  authorize("super_admin"),
  validate(updateDepartmentSchema),
  controller.update
);

// DELETE /api/v1/departments/:id — super_admin only (must have 0 assigned doctors)
router.delete("/:id", authorize("super_admin"), controller.delete);

export default router;
