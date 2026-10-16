import { Router } from "express";
import { AppointmentController } from "../controllers/appointment.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import {
  bookAppointmentSchema,
  updateAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsSchema,
  completeAppointmentSchema,
} from "../validators/appointment.validator";

import { AppointmentRepository } from "../repositories/implementations/AppointmentRepository";
import { PatientRepository } from "../repositories/implementations/PatientRepository";
import { ScheduleRepository } from "../repositories/implementations/ScheduleRepository";
import { DoctorRepository } from "../repositories/implementations/DoctorRepository";
import { AuditLogRepository } from "../repositories/implementations/AuditLogRepository";
import { BookAppointmentUseCase } from "../usecases/appointments/BookAppointmentUseCase";
import { ListAppointmentsUseCase } from "../usecases/appointments/ListAppointmentsUseCase";
import { UpdateAppointmentUseCase } from "../usecases/appointments/UpdateAppointmentUseCase";
import { CancelAppointmentUseCase } from "../usecases/appointments/CancelAppointmentUseCase";
import { MarkArrivedUseCase } from "../usecases/appointments/MarkArrivedUseCase";
import { CompleteAppointmentUseCase } from "../usecases/appointments/CompleteAppointmentUseCase";

// Wire dependencies
const appointmentRepo = new AppointmentRepository();
const patientRepo = new PatientRepository();
const scheduleRepo = new ScheduleRepository();
const doctorRepo = new DoctorRepository();
const auditLogRepo = new AuditLogRepository();

const bookAppointmentUseCase = new BookAppointmentUseCase(
  appointmentRepo,
  patientRepo,
  scheduleRepo,
  doctorRepo,
  auditLogRepo
);

const listAppointmentsUseCase = new ListAppointmentsUseCase(appointmentRepo);
const updateAppointmentUseCase = new UpdateAppointmentUseCase(appointmentRepo, auditLogRepo);
const cancelAppointmentUseCase = new CancelAppointmentUseCase(appointmentRepo, auditLogRepo);
const markArrivedUseCase = new MarkArrivedUseCase(appointmentRepo, auditLogRepo);
const completeAppointmentUseCase = new CompleteAppointmentUseCase(appointmentRepo, auditLogRepo);

const controller = new AppointmentController(
  bookAppointmentUseCase,
  listAppointmentsUseCase,
  updateAppointmentUseCase,
  cancelAppointmentUseCase,
  markArrivedUseCase,
  completeAppointmentUseCase,
  appointmentRepo,
  doctorRepo
);

const router = Router();

router.use(authenticate);

// POST — receptionist and super_admin can book
router.post(
  "/",
  authorize("super_admin", "receptionist"),
  validate(bookAppointmentSchema),
  controller.book
);

// GET — all roles can list (doctors see only their own — enforced in controller)
router.get("/", validate(listAppointmentsSchema), controller.list);

// GET by ID — all roles
router.get("/:id", controller.getById);

// PUT — receptionist, super_admin, doctor (doctor: notes only, own appointments)
router.put(
  "/:id",
  authorize("super_admin", "receptionist", "doctor"),
  validate(updateAppointmentSchema),
  controller.update
);

// DELETE (cancel) — receptionist and super_admin
router.delete(
  "/:id",
  authorize("super_admin", "receptionist"),
  validate(cancelAppointmentSchema),
  controller.cancel
);

// POST /:id/arrive — receptionist and super_admin
router.post(
  "/:id/arrive",
  authorize("super_admin", "receptionist"),
  controller.markArrived
);

// POST /:id/complete — doctor, receptionist, super_admin
router.post(
  "/:id/complete",
  authorize("super_admin", "receptionist", "doctor"),
  validate(completeAppointmentSchema),
  controller.complete
);

export default router;
