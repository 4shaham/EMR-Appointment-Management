import { ISchedule, ScheduleModel } from "../../models/Schedule.model";
import { IScheduleRepository } from "../interfaces/IScheduleRepository";

export class ScheduleRepository implements IScheduleRepository {
  async findByDoctorId(doctorId: string): Promise<ISchedule | null> {
    return ScheduleModel.findOne({ doctorId }).exec();
  }

  async upsert(doctorId: string, data: Partial<ISchedule>): Promise<ISchedule> {
    const updateData: Record<string, unknown> = {
      ...data,
      doctorId,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    const schedule = await ScheduleModel.findOneAndUpdate(
      { doctorId },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec();
    return schedule!;
  }
}
