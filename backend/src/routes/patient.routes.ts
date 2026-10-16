import { Router } from "express";
import { PatientController } from "../controllers/patient.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";

import { PatientRepository } from "../repositories/implementations/PatientRepository";

const patientRepo = new PatientRepository();
const controller = new PatientController(patientRepo);

const router = Router();

router.use(authenticate);

// GET /api/v1/patients?name=&mobile=&patientId= — receptionist and super_admin
router.get(
  "/",
  authorize("super_admin", "receptionist"),
  controller.search
);

// POST /api/v1/patients — receptionist and super_admin
router.post(
  "/",
  authorize("super_admin", "receptionist"),
  controller.create
);

// GET /api/v1/patients/:id
router.get(
  "/:id",
  authorize("super_admin", "receptionist", "doctor"),
  controller.getById
);

export default router;
