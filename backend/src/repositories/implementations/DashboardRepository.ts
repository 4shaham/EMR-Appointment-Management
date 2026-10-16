import mongoose from "mongoose";
import {
  IDashboardRepository,
  SuperAdminDashboardData,
  DoctorDashboardData,
  ReceptionistDashboardData,
} from "../interfaces/IDashboardRepository";
import { DoctorModel } from "../../models/Doctor.model";
import { UserModel } from "../../models/User.model";
import { DepartmentModel } from "../../models/Department.model";
import { AppointmentModel } from "../../models/Appointment.model";
import { AppError } from "../../utils/AppError";

export class DashboardRepository implements IDashboardRepository {
  private getDateBounds(targetDate: string): { startOfDay: Date; endOfDay: Date } {
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);
    return { startOfDay, endOfDay };
  }

  async getSuperAdminData(targetDate: string): Promise<SuperAdminDashboardData> {
    const { startOfDay, endOfDay } = this.getDateBounds(targetDate);
    const todayQuery = { appointmentDate: { $gte: startOfDay, $lte: endOfDay } };

    const [
      totalDoctors,
      activeDoctors,
      totalReceptionists,
      totalDepartments,
      totalAppointments,
      todayAppointments,
      todayScheduled,
      todayArrived,
      todayCompleted,
      todayCancelled,
      allScheduled,
      allArrived,
      allCompleted,
      allCancelled,
      recentAppointments,
    ] = await Promise.all([
      DoctorModel.countDocuments({}),
      DoctorModel.countDocuments({ isActive: true }),
      UserModel.countDocuments({ role: "receptionist", isActive: true }),
      DepartmentModel.countDocuments({}),
      AppointmentModel.countDocuments({}),
      AppointmentModel.countDocuments(todayQuery),
      AppointmentModel.countDocuments({ ...todayQuery, status: "scheduled" }),
      AppointmentModel.countDocuments({ ...todayQuery, status: "arrived" }),
      AppointmentModel.countDocuments({ ...todayQuery, status: "completed" }),
      AppointmentModel.countDocuments({ ...todayQuery, status: "cancelled" }),
      AppointmentModel.countDocuments({ status: "scheduled" }),
      AppointmentModel.countDocuments({ status: "arrived" }),
      AppointmentModel.countDocuments({ status: "completed" }),
      AppointmentModel.countDocuments({ status: "cancelled" }),
      AppointmentModel.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("patientId", "name patientId mobile gender")
        .populate("doctorId", "name specialization")
        .populate("departmentId", "name")
        .populate("bookedBy", "name role")
        .lean(),
    ]);

    return {
      role: "super_admin",
      date: targetDate,
      totals: {
        doctors: totalDoctors,
        activeDoctors,
        receptionists: totalReceptionists,
        departments: totalDepartments,
        appointments: totalAppointments,
      },
      today: {
        total: todayAppointments,
        scheduled: todayScheduled,
        arrived: todayArrived,
        completed: todayCompleted,
        cancelled: todayCancelled,
      },
      allTimeStatus: {
        scheduled: allScheduled,
        arrived: allArrived,
        completed: allCompleted,
        cancelled: allCancelled,
      },
      recentAppointments,
    };
  }

  async getDoctorData(userId: string, targetDate: string): Promise<DoctorDashboardData> {
    const doctor = await DoctorModel.findOne({ userId })
      .populate("departmentId", "name")
      .exec();

    if (!doctor) {
      throw new AppError("Doctor profile not found for authenticated user", 404);
    }

    const { startOfDay, endOfDay } = this.getDateBounds(targetDate);
    const doctorFilter = { doctorId: doctor._id };
    const todayFilter = {
      doctorId: doctor._id,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    };

    const [
      totalAppointments,
      todayAppointments,
      todayScheduled,
      todayArrived,
      todayCompleted,
      todayCancelled,
      allScheduled,
      allArrived,
      allCompleted,
      allCancelled,
      upcomingAppointments,
      todayAppointmentsList,
    ] = await Promise.all([
      AppointmentModel.countDocuments(doctorFilter),
      AppointmentModel.countDocuments(todayFilter),
      AppointmentModel.countDocuments({ ...todayFilter, status: "scheduled" }),
      AppointmentModel.countDocuments({ ...todayFilter, status: "arrived" }),
      AppointmentModel.countDocuments({ ...todayFilter, status: "completed" }),
      AppointmentModel.countDocuments({ ...todayFilter, status: "cancelled" }),
      AppointmentModel.countDocuments({ ...doctorFilter, status: "scheduled" }),
      AppointmentModel.countDocuments({ ...doctorFilter, status: "arrived" }),
      AppointmentModel.countDocuments({ ...doctorFilter, status: "completed" }),
      AppointmentModel.countDocuments({ ...doctorFilter, status: "cancelled" }),
      AppointmentModel.find({
        doctorId: doctor._id,
        appointmentDate: { $gte: startOfDay },
        status: { $ne: "cancelled" },
      })
        .sort({ appointmentDate: 1, slotTime: 1 })
        .limit(10)
        .populate("patientId", "name patientId mobile email age gender bloodGroup")
        .populate("departmentId", "name")
        .lean(),
      AppointmentModel.find(todayFilter)
        .sort({ slotTime: 1 })
        .populate("patientId", "name patientId mobile email age gender bloodGroup")
        .populate("departmentId", "name")
        .lean(),
    ]);

    const dept = doctor.departmentId as { name?: string } | null;

    return {
      role: "doctor",
      date: targetDate,
      doctorProfile: {
        id: doctor._id.toString(),
        name: doctor.name,
        specialization: doctor.specialization,
        departmentName: dept?.name,
      },
      totalAppointments,
      today: {
        total: todayAppointments,
        scheduled: todayScheduled,
        arrived: todayArrived,
        completed: todayCompleted,
        cancelled: todayCancelled,
      },
      allTimeStatus: {
        scheduled: allScheduled,
        arrived: allArrived,
        completed: allCompleted,
        cancelled: allCancelled,
      },
      upcomingAppointments,
      todayAppointmentsList,
    };
  }

  async getReceptionistData(targetDate: string): Promise<ReceptionistDashboardData> {
    const { startOfDay, endOfDay } = this.getDateBounds(targetDate);
    const todayFilter = { appointmentDate: { $gte: startOfDay, $lte: endOfDay } };

    const [
      activeDoctorsCount,
      totalDepartments,
      totalBooked,
      todayAppointments,
      todayScheduled,
      todayArrived,
      todayCompleted,
      todayCancelled,
      todayAppointmentsList,
      activeDoctorsList,
    ] = await Promise.all([
      DoctorModel.countDocuments({ isActive: true }),
      DepartmentModel.countDocuments({}),
      AppointmentModel.countDocuments({}),
      AppointmentModel.countDocuments(todayFilter),
      AppointmentModel.countDocuments({ ...todayFilter, status: "scheduled" }),
      AppointmentModel.countDocuments({ ...todayFilter, status: "arrived" }),
      AppointmentModel.countDocuments({ ...todayFilter, status: "completed" }),
      AppointmentModel.countDocuments({ ...todayFilter, status: "cancelled" }),
      AppointmentModel.find(todayFilter)
        .sort({ slotTime: 1 })
        .populate("patientId", "name patientId mobile")
        .populate("doctorId", "name specialization")
        .populate("departmentId", "name")
        .lean(),
      DoctorModel.find({ isActive: true })
        .populate("departmentId", "name")
        .select("name specialization departmentId experience phone")
        .lean(),
    ]);

    return {
      role: "receptionist",
      date: targetDate,
      totals: {
        doctors: activeDoctorsCount,
        departments: totalDepartments,
      },
      bookingStatistics: {
        totalBooked,
        todayTotal: todayAppointments,
        scheduled: todayScheduled,
        arrived: todayArrived,
        completed: todayCompleted,
        cancelled: todayCancelled,
      },
      todayAppointmentsList,
      activeDoctorsList,
    };
  }
}
