import mongoose, { Document, Schema } from "mongoose";

export interface IDoctor extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;  // Links to User (role: doctor)
  departmentId: mongoose.Types.ObjectId;
  name: string;
  specialization: string;
  qualification?: string;
  experience?: number;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<IDoctor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    qualification: { type: String, trim: true },
    experience: { type: Number },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const DoctorModel = mongoose.model<IDoctor>("Doctor", doctorSchema);
