import { IPatient } from "../../models/Patient.model";

export interface IPatientSearchFilter {
  patientId?: string;
  mobile?: string;
  name?: string;
}

export interface IPatientRepository {
  findById(id: string): Promise<IPatient | null>;
  findByPatientId(patientId: string): Promise<IPatient | null>;
  search(filter: IPatientSearchFilter): Promise<IPatient[]>;
  create(data: Partial<IPatient>): Promise<IPatient>;
  getNextPatientId(): Promise<string>;
}
