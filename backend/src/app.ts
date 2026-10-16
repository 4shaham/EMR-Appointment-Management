import express, { Application, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";

// Routes
import authRoutes from "./routes/auth.routes";
import doctorRoutes from "./routes/doctor.routes";
import slotRoutes from "./routes/slot.routes";
import appointmentRoutes from "./routes/appointment.routes";
import patientRoutes from "./routes/patient.routes";
import departmentRoutes from "./routes/department.routes";
import userRoutes from "./routes/user.routes";
import auditLogRoutes from "./routes/auditLog.routes";
import dashboardRoutes from "./routes/dashboard.routes";

export function createApp(): Application {
  const app = express();

  // ── Security & Parsing ───────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin === env.clientUrl ||
          /^http:\/\/localhost(:\d+)?$/.test(origin) ||
          /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── HTTP Logging ─────────────────────────────────────────────────────────
  if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
  }

  // ── Health Check ─────────────────────────────────────────────────────────
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: "EMR Appointment Service is running",
      timestamp: new Date().toISOString(),
    });
  });

  // ── API Routes ───────────────────────────────────────────────────────────
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/doctors", doctorRoutes);
  app.use("/api/v1/slots", slotRoutes);
  app.use("/api/v1/appointments", appointmentRoutes);
  app.use("/api/v1/patients", patientRoutes);
  app.use("/api/v1/departments", departmentRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/audit-logs", auditLogRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);

  // ── 404 Handler ──────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
    });
  });

  // ── Centralized Error Handler ────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
