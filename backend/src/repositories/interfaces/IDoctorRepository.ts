import { IDoctor } from "../../models/Doctor.model";

export interface IDoctorRepository {
  findById(id: string): Promise<IDoctor | null>;
  findAll(filter?: { departmentId?: string; isActive?: boolean }): Promise<IDoctor[]>;
  findByUserId(userId: string): Promise<IDoctor | null>;
  create(data: Partial<IDoctor>): Promise<IDoctor>;
  update(id: string, data: Partial<IDoctor>): Promise<IDoctor | null>;
}
