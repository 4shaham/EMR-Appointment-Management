import { Request, Response, NextFunction } from "express";
import { IPatientRepository, IPatientSearchFilter } from "../repositories/interfaces/IPatientRepository";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";

export class PatientController {
  constructor(private patientRepo: IPatientRepository) {}

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const patientId = req.query.patientId as string | undefined;
      const mobile = req.query.mobile as string | undefined;
      const name = req.query.name as string | undefined;

      if (!patientId && !mobile && !name) {
        throw new AppError(
          "At least one search parameter (patientId, mobile, or name) is required.",
          400
        );
      }

      const filter: IPatientSearchFilter = { patientId, mobile, name };
      const patients = await this.patientRepo.search(filter);
      sendSuccess(res, "Patients retrieved successfully", patients);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const patient = await this.patientRepo.findById(id);
      if (!patient) throw new AppError("Patient not found.", 404);
      sendSuccess(res, "Patient retrieved successfully", patient);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, mobile, email, age, gender, address } = req.body;
      if (!name || !mobile || !age || !gender) {
        throw new AppError("name, mobile, age, and gender are required.", 400);
      }

      const patientId = await this.patientRepo.getNextPatientId();
      const patient = await this.patientRepo.create({
        patientId,
        name: name.trim(),
        mobile: mobile.trim(),
        email: email?.trim(),
        age: Number(age),
        gender,
        address: address?.trim(),
      });

      sendSuccess(res, "Patient created successfully", patient, 201);
    } catch (err) {
      next(err);
    }
  };
}
