import mongoose from "mongoose";
import { env } from "./env";

export async function connectDatabase(): Promise<void> {
  const primaryUrl = env.mongoUrl;
  const fallbackUrl = "mongodb://127.0.0.1:27017/emr";

  try {
    console.log("[DB] Connecting to MongoDB...");
    await mongoose.connect(primaryUrl, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log("[DB] MongoDB connected successfully to primary database");
  } catch (error) {
    console.warn("[DB] Failed to connect to primary MongoDB URL:", (error as Error).message);
    if (primaryUrl !== fallbackUrl) {
      try {
        console.log("[DB] Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/emr)...");
        await mongoose.connect(fallbackUrl, {
          serverSelectionTimeoutMS: 5000,
        });
        console.log("[DB] Connected successfully to fallback local MongoDB");
        return;
      } catch (fallbackErr) {
        console.error("[DB] Fallback local MongoDB connection failed:", (fallbackErr as Error).message);
      }
    }
    console.error("[DB] MongoDB connection failed. If using Atlas, ensure your current IP address is whitelisted in Atlas Network Access, or start local MongoDB on port 27017.");
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] MongoDB disconnected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[DB] MongoDB error:", err);
  });
}
