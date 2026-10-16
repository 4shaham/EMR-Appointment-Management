import { IPatient, PatientModel } from "../../models/Patient.model";
import {
  IPatientRepository,
  IPatientSearchFilter,
} from "../interfaces/IPatientRepository";

export class PatientRepository implements IPatientRepository {
  async findById(id: string): Promise<IPatient | null> {
    return PatientModel.findById(id).exec();
  }

  async findByPatientId(patientId: string): Promise<IPatient | null> {
    return PatientModel.findOne({ patientId }).exec();
  }

  async search(filter: IPatientSearchFilter): Promise<IPatient[]> {
    const conditions: Record<string, unknown>[] = [];

    if (filter.patientId) {
      conditions.push({ patientId: filter.patientId });
    }
    if (filter.mobile) {
      conditions.push({ mobile: { $regex: filter.mobile, $options: "i" } });
    }
    if (filter.name) {
      conditions.push({ name: { $regex: filter.name, $options: "i" } });
    }

    if (conditions.length === 0) return [];

    return PatientModel.find({ $or: conditions }).limit(20).exec();
  }

  async create(data: Partial<IPatient>): Promise<IPatient> {
    const patient = new PatientModel(data);
    return patient.save();
  }

  async getNextPatientId(): Promise<string> {
    const count = await PatientModel.countDocuments().exec();
    const paddedNum = String(count + 1).padStart(6, "0");
    return `PAT-${paddedNum}`;
  }
}
