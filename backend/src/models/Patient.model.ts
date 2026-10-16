import mongoose, { Document, Schema } from "mongoose";

export interface IPatient extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: string;   // Auto-generated, human-readable (e.g., "PAT-000001")
  name: string;
  mobile: string;
  email?: string;
  age?: number;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  address?: string;
  bloodGroup?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<IPatient>(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    age: { type: Number },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    address: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound text index for name search
patientSchema.index({ name: "text" });

export const PatientModel = mongoose.model<IPatient>("Patient", patientSchema);
