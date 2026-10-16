import mongoose, { Document, Schema } from "mongoose";
import { AppointmentStatus } from "../types";

export interface IAppointment extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  appointmentDate: Date;          // The calendar date (stored as midnight UTC)
  slotTime: string;               // "HH:MM" — the slot start time
  status: AppointmentStatus;
  purpose?: string;
  notes?: string;
  bookedBy: mongoose.Types.ObjectId;  // User who booked (receptionist/super_admin)
  arrivedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  isCancelled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    appointmentDate: { type: Date, required: true, index: true },
    slotTime: { type: String, required: true },
    status: {
      type: String,
      enum: ["scheduled", "arrived", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    isCancelled: { type: Boolean, default: false, index: true },
    purpose: { type: String, trim: true },
    notes: { type: String, trim: true },
    bookedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    arrivedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true },
  },
  { timestamps: true }
);

appointmentSchema.pre("save", function () {
  if (this.status === "cancelled") {
    this.isCancelled = true;
  }
});

// ─── Indexes ────────────────────────────────────────────────────────────────
// Compound unique index prevents double-booking: same doctor + date + slot
// This is the atomic guard against concurrent bookings.
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, slotTime: 1 },
  {
    unique: true,
    partialFilterExpression: { isCancelled: false },
  }
);

// Compound index for common list queries
appointmentSchema.index({ appointmentDate: 1, doctorId: 1, status: 1 });

export const AppointmentModel = mongoose.model<IAppointment>(
  "Appointment",
  appointmentSchema
);
