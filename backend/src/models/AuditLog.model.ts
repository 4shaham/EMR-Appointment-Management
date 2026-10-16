import mongoose, { Document, Schema } from "mongoose";
import { AuditAction, UserRole } from "../types";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userRole: UserRole;
  action: AuditAction;
  entity: string;         // e.g., "Appointment", "User"
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userRole: {
      type: String,
      enum: ["super_admin", "receptionist", "doctor"],
      required: true,
    },
    action: {
      type: String,
      enum: [
        "LOGIN",
        "LOGOUT",
        "APPOINTMENT_CREATED",
        "APPOINTMENT_UPDATED",
        "APPOINTMENT_CANCELLED",
        "APPOINTMENT_ARRIVED",
        "APPOINTMENT_COMPLETED",
        "SCHEDULE_UPDATED",
        "PATIENT_CREATED",
        "DOCTOR_CREATED",
        "DOCTOR_UPDATED",
        "DEPARTMENT_CREATED",
        "DEPARTMENT_UPDATED",
        "DEPARTMENT_DELETED",
        "USER_CREATED",
      ],
      required: true,
      index: true,
    },
    entity: { type: String, required: true },
    entityId: { type: String },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // immutable logs
    versionKey: false,
  }
);

// Index for audit queries
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = mongoose.model<IAuditLog>(
  "AuditLog",
  auditLogSchema
);
