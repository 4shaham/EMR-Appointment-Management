import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { DashboardRepository } from "../repositories/implementations/DashboardRepository";
import { GetDashboardDataUseCase } from "../usecases/dashboard/GetDashboardDataUseCase";
import { authenticate } from "../middlewares/authenticate";

const dashboardRepo = new DashboardRepository();
const getDashboardDataUseCase = new GetDashboardDataUseCase(dashboardRepo);
const controller = new DashboardController(getDashboardDataUseCase);

const router = Router();

// All dashboard endpoints require authentication
router.use(authenticate);

// GET /api/v1/dashboard - returns role-tailored dashboard data
router.get("/", controller.getDashboard);

export default router;
