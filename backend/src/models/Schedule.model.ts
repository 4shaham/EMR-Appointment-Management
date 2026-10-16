import mongoose, { Document, Schema } from "mongoose";
import { DayOfWeek } from "../types";

export interface ITimeRange {
  start: string; // "HH:MM" 24-hour format
  end: string;
}

export interface ISession extends ITimeRange {
  label?: string; // e.g. "Morning", "Evening"
}

export interface IDaySchedule {
  day: DayOfWeek;
  sessions: ISession[];
  breaks: ITimeRange[];
  slotDurationMinutes: number;
}

export interface ISchedule extends Document {
  _id: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  workingDays: IDaySchedule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const timeRangeSchema = new Schema<ITimeRange>(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false }
);

const sessionSchema = new Schema<ISession>(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
    label: { type: String },
  },
  { _id: false }
);

const dayScheduleSchema = new Schema<IDaySchedule>(
  {
    day: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      required: true,
    },
    sessions: { type: [sessionSchema], required: true },
    breaks: { type: [timeRangeSchema], default: [] },
    slotDurationMinutes: { type: Number, required: true, min: 5 },
  },
  { _id: false }
);

const scheduleSchema = new Schema<ISchedule>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      unique: true,
      index: true,
    },
    workingDays: { type: [dayScheduleSchema], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ScheduleModel = mongoose.model<ISchedule>(
  "Schedule",
  scheduleSchema
);
