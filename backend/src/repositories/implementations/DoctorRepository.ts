import { IDoctor, DoctorModel } from "../../models/Doctor.model";
import { IDoctorRepository } from "../interfaces/IDoctorRepository";

export class DoctorRepository implements IDoctorRepository {
  async findById(id: string): Promise<IDoctor | null> {
    return DoctorModel.findById(id)
      .populate("userId", "name email")
      .populate("departmentId", "name")
      .exec();
  }

  async findAll(filter?: {
    departmentId?: string;
    isActive?: boolean;
  }): Promise<IDoctor[]> {
    const query: Record<string, unknown> = {};
    if (filter?.departmentId) query.departmentId = filter.departmentId;
    if (filter?.isActive !== undefined) query.isActive = filter.isActive;

    return DoctorModel.find(query)
      .populate("userId", "name email")
      .populate("departmentId", "name")
      .sort({ name: 1 })
      .exec();
  }

  async findByUserId(userId: string): Promise<IDoctor | null> {
    return DoctorModel.findOne({ userId })
      .populate("userId", "name email")
      .populate("departmentId", "name")
      .exec();
  }

  async create(data: Partial<IDoctor>): Promise<IDoctor> {
    const doctor = new DoctorModel(data);
    return doctor.save();
  }

  async update(id: string, data: Partial<IDoctor>): Promise<IDoctor | null> {
    return DoctorModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate("userId", "name email")
      .populate("departmentId", "name")
      .exec();
  }
}
