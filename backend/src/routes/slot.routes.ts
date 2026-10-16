import { Router } from "express";
import { SlotController } from "../controllers/slot.controller";
import { authenticate } from "../middlewares/authenticate";

import { ScheduleRepository } from "../repositories/implementations/ScheduleRepository";
import { AppointmentRepository } from "../repositories/implementations/AppointmentRepository";
import { DoctorRepository } from "../repositories/implementations/DoctorRepository";
import { GetSlotsUseCase } from "../usecases/slots/GetSlotsUseCase";

const scheduleRepo = new ScheduleRepository();
const appointmentRepo = new AppointmentRepository();
const doctorRepo = new DoctorRepository();

const getSlotsUseCase = new GetSlotsUseCase(
  scheduleRepo,
  appointmentRepo,
  doctorRepo
);

const controller = new SlotController(getSlotsUseCase, doctorRepo);

const router = Router();

router.use(authenticate);

// GET /api/v1/slots?doctorId=&date=&departmentId=
router.get("/", controller.getSlots);

export default router;
