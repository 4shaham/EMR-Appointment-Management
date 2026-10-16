import { Router } from "express";
import { AuditLogController } from "../controllers/auditLog.controller";
import { AuditLogRepository } from "../repositories/implementations/AuditLogRepository";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";

const auditLogRepo = new AuditLogRepository();
const controller = new AuditLogController(auditLogRepo);

const router = Router();

router.use(authenticate);

// GET /api/v1/audit-logs — super_admin only
router.get("/", authorize("super_admin"), controller.getAll);

export default router;
