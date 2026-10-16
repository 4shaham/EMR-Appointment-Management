import { ISchedule } from "../../models/Schedule.model";

export interface IScheduleRepository {
  findByDoctorId(doctorId: string): Promise<ISchedule | null>;
  upsert(doctorId: string, data: Partial<ISchedule>): Promise<ISchedule>;
}
