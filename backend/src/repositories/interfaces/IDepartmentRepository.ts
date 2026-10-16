import { IDepartment } from "../../models/Department.model";

export interface IDepartmentRepository {
  findById(id: string): Promise<IDepartment | null>;
  findByName(name: string, excludeId?: string): Promise<IDepartment | null>;
  findAll(onlyActive?: boolean): Promise<IDepartment[]>;
  create(data: Partial<IDepartment>): Promise<IDepartment>;
  update(id: string, data: Partial<IDepartment>): Promise<IDepartment | null>;
  delete(id: string): Promise<boolean>;
  countDoctorsInDepartment(departmentId: string): Promise<number>;
}

