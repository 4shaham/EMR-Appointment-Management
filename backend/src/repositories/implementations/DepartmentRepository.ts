import { IDepartment, DepartmentModel } from "../../models/Department.model";
import { DoctorModel } from "../../models/Doctor.model";
import { IDepartmentRepository } from "../interfaces/IDepartmentRepository";

export class DepartmentRepository implements IDepartmentRepository {
  async findById(id: string): Promise<IDepartment | null> {
    return DepartmentModel.findById(id).exec();
  }

  async findByName(name: string, excludeId?: string): Promise<IDepartment | null> {
    const trimmed = name.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const query: Record<string, unknown> = {
      name: { $regex: new RegExp(`^${escaped}$`, "i") },
    };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    return DepartmentModel.findOne(query).exec();
  }

  async findAll(onlyActive = true): Promise<IDepartment[]> {
    const query = onlyActive ? { isActive: true } : {};
    return DepartmentModel.find(query).sort({ name: 1 }).exec();
  }

  async create(data: Partial<IDepartment>): Promise<IDepartment> {
    const department = new DepartmentModel({
      ...data,
      name: data.name ? data.name.trim() : data.name,
      description: data.description ? data.description.trim() : data.description,
    });
    return department.save();
  }

  async update(id: string, data: Partial<IDepartment>): Promise<IDepartment | null> {
    const updateData = { ...data };
    if (updateData.name !== undefined) {
      updateData.name = updateData.name.trim();
    }
    if (updateData.description !== undefined && typeof updateData.description === "string") {
      updateData.description = updateData.description.trim();
    }
    return DepartmentModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const res = await DepartmentModel.findByIdAndDelete(id).exec();
    return !!res;
  }

  async countDoctorsInDepartment(departmentId: string): Promise<number> {
    return DoctorModel.countDocuments({ departmentId }).exec();
  }
}

