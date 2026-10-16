import http from "http";
import { env, validateEnv } from "./config/env";
import { connectDatabase } from "./config/database";
import { initSocket } from "./config/socket";
import { createApp } from "./app";
import { AppointmentModel } from "./models/Appointment.model";
import { DepartmentModel } from "./models/Department.model";
import { seedDefaultAccounts } from "./utils/seeder";

async function bootstrap() {
  // 1. Validate required environment variables before anything else
  validateEnv();

  // 2. Connect to MongoDB
  await connectDatabase();

  // 2b. Auto-seed core accounts and departments if missing
  try {
    await seedDefaultAccounts();
  } catch (err) {
    console.warn("[DB] Note on auto-seeding:", err);
  }

  // Ensure unique indexes are built and synced in MongoDB
  try {
    await Promise.all([
      AppointmentModel.createIndexes(),
      DepartmentModel.createIndexes(),
    ]);
  } catch (err) {
    console.warn("[DB] Note on index creation:", err);
  }

  // 3. Create Express app
  const app = createApp();

  // 4. Create HTTP server and attach Socket.IO
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  // 5. Start listening
  httpServer.listen(env.port, () => {
    console.log(
      `[Server] EMR Appointment API running on port ${env.port} (${env.nodeEnv})`
    );
  });

  // 6. Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      console.log("[Server] HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("[Server] Unhandled Rejection:", reason);
    process.exit(1);
  });
}

bootstrap();
