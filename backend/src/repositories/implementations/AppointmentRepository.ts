import mongoose from "mongoose";
import { IAppointment, AppointmentModel } from "../../models/Appointment.model";
import { PatientModel } from "../../models/Patient.model";
import { DoctorModel } from "../../models/Doctor.model";
import {
  IAppointmentRepository,
  IAppointmentFilter,
  IAppointmentListResult,
} from "../interfaces/IAppointmentRepository";

export class AppointmentRepository implements IAppointmentRepository {
  async findById(id: string): Promise<IAppointment | null> {
    return AppointmentModel.findById(id)
      .populate("patientId", "name mobile patientId")
      .populate("doctorId", "name specialization")
      .populate("departmentId", "name")
      .populate("bookedBy", "name role")
      .exec();
  }

  async findBookedSlots(doctorId: string, date: Date): Promise<string[]> {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const appointments = await AppointmentModel.find({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: "cancelled" },
    })
      .select("slotTime")
      .lean()
      .exec();

    return appointments.map((a) => a.slotTime);
  }

  async list(
    filter: IAppointmentFilter,
    page: number,
    limit: number,
    sortBy = "appointmentDate",
    sortOrder: "asc" | "desc" = "asc"
  ): Promise<IAppointmentListResult> {
    const query: Record<string, unknown> = {};

    if (filter.doctorId) query.doctorId = new mongoose.Types.ObjectId(filter.doctorId);
    if (filter.departmentId) query.departmentId = new mongoose.Types.ObjectId(filter.departmentId);
    if (filter.patientId) query.patientId = new mongoose.Types.ObjectId(filter.patientId);
    if (filter.status) query.status = filter.status;

    if (filter.dateFrom || filter.dateTo) {
      query.appointmentDate = {};
      if (filter.dateFrom)
        (query.appointmentDate as Record<string, Date>).$gte = filter.dateFrom;
      if (filter.dateTo)
        (query.appointmentDate as Record<string, Date>).$lte = filter.dateTo;
    }

    // If a search string is provided, look up matching patients and doctors
    if (filter.search) {
      const [patients, doctors] = await Promise.all([
        PatientModel.find({
          $or: [
            { name: { $regex: filter.search, $options: "i" } },
            { mobile: { $regex: filter.search, $options: "i" } },
            { patientId: { $regex: filter.search, $options: "i" } },
          ],
        })
          .select("_id")
          .lean()
          .exec(),
        DoctorModel.find({
          name: { $regex: filter.search, $options: "i" },
        })
          .select("_id")
          .lean()
          .exec(),
      ]);

      const patientIds = patients.map((p) => p._id);
      const doctorIds = doctors.map((d) => d._id);

      query.$or = [
        { patientId: { $in: patientIds } },
        { doctorId: { $in: doctorIds } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const [appointments, total] = await Promise.all([
      AppointmentModel.find(query)
        .populate("patientId", "name mobile patientId")
        .populate("doctorId", "name specialization")
        .populate("departmentId", "name")
        .populate("bookedBy", "name role")
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
      AppointmentModel.countDocuments(query).exec(),
    ]);

    return {
      appointments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: Partial<IAppointment>): Promise<IAppointment> {
    const appointment = new AppointmentModel(data);
    return appointment.save();
  }

  async update(
    id: string,
    data: Partial<IAppointment>
  ): Promise<IAppointment | null> {
    return AppointmentModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate("patientId", "name mobile patientId")
      .populate("doctorId", "name specialization")
      .populate("departmentId", "name")
      .populate("bookedBy", "name role")
      .exec();
  }

  async softDelete(
    id: string,
    cancelReason?: string
  ): Promise<IAppointment | null> {
    return AppointmentModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "cancelled",
          isCancelled: true,
          cancelledAt: new Date(),
          cancelReason: cancelReason || "Cancelled by user",
        },
      },
      { new: true }
    ).exec();
  }
}
