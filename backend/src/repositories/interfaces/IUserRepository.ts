import { IUser } from "../../models/User.model";

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByIdWithPassword(id: string): Promise<IUser | null>;
  findByRole(role: string): Promise<IUser[]>;
  create(data: Partial<IUser>): Promise<IUser>;
  update(id: string, data: Partial<IUser>): Promise<IUser | null>;
}

