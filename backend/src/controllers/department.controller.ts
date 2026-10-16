import { Request, Response, NextFunction } from "express";
import { IDepartmentRepository } from "../repositories/interfaces/IDepartmentRepository";
import { IAuditLogRepository } from "../repositories/interfaces/IAuditLogRepository";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";

export class DepartmentController {
  constructor(
    private departmentRepo: IDepartmentRepository,
    private auditLogRepo?: IAuditLogRepository
  ) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const showAll = req.query.all === "true" || req.query.onlyActive === "false";
      const onlyActive = !showAll;
      const departments = await this.departmentRepo.findAll(onlyActive);

      const dataWithDoctorCounts = await Promise.all(
        departments.map(async (dept) => {
          const doctorCount = await this.departmentRepo.countDoctorsInDepartment(
            dept._id.toString()
          );
          return {
            ...dept.toObject(),
            doctorCount,
          };
        })
      );

      sendSuccess(res, "Departments retrieved successfully", dataWithDoctorCounts);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const department = await this.departmentRepo.findById(id);
      if (!department) {
        throw new AppError("Department not found.", 404);
      }

      const doctorCount = await this.departmentRepo.countDoctorsInDepartment(id);
      sendSuccess(res, "Department retrieved successfully", {
        ...department.toObject(),
        doctorCount,
      });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, description, isActive } = req.body;
      if (!name || typeof name !== "string") {
        throw new AppError("Department name is required.", 400);
      }

      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        throw new AppError("Department name must be at least 2 characters.", 400);
      }

      // Check for duplicate name (case-insensitive and trimmed)
      const existing = await this.departmentRepo.findByName(trimmedName);
      if (existing) {
        throw new AppError(
          `A department with the name "${trimmedName}" already exists. Department names must be unique.`,
          409
        );
      }

      const department = await this.departmentRepo.create({
        name: trimmedName,
        description: description ? String(description).trim() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      });

      if (this.auditLogRepo && req.user) {
        await this.auditLogRepo.create({
          userId: req.user.userId,
          userRole: req.user.role,
          action: "DEPARTMENT_CREATED",
          entity: "Department",
          entityId: department._id.toString(),
          details: { name: department.name },
        });
      }

      sendSuccess(res, "Department created successfully", department, 201);
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        return next(
          new AppError("A department with this name already exists (names must be unique).", 409)
        );
      }
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const department = await this.departmentRepo.findById(id);
      if (!department) {
        throw new AppError("Department not found.", 404);
      }

      const { name, description, isActive } = req.body;
      const updateData: Record<string, unknown> = {};

      if (name !== undefined) {
        const trimmedName = String(name).trim();
        if (trimmedName.length < 2) {
          throw new AppError("Department name must be at least 2 characters.", 400);
        }

        // Check if duplicate exists with another department id
        const existing = await this.departmentRepo.findByName(trimmedName, id);
        if (existing) {
          throw new AppError(
            `Another department with the name "${trimmedName}" already exists. Department names must be unique.`,
            409
          );
        }
        updateData.name = trimmedName;
      }

      if (description !== undefined) {
        updateData.description = description ? String(description).trim() : "";
      }

      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive);
      }

      const updated = await this.departmentRepo.update(id, updateData);

      if (this.auditLogRepo && req.user) {
        await this.auditLogRepo.create({
          userId: req.user.userId,
          userRole: req.user.role,
          action: "DEPARTMENT_UPDATED",
          entity: "Department",
          entityId: id,
          details: { changes: updateData },
        });
      }

      sendSuccess(res, "Department updated successfully", updated);
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        return next(
          new AppError("A department with this name already exists (names must be unique).", 409)
        );
      }
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const department = await this.departmentRepo.findById(id);
      if (!department) {
        throw new AppError("Department not found.", 404);
      }

      // Check if any doctors reference this department
      const doctorCount = await this.departmentRepo.countDoctorsInDepartment(id);
      if (doctorCount > 0) {
        throw new AppError(
          `Cannot delete department "${department.name}". There are ${doctorCount} doctor(s) assigned to this department. Please reassign or remove all doctors before deleting this department.`,
          400
        );
      }

      await this.departmentRepo.delete(id);

      if (this.auditLogRepo && req.user) {
        await this.auditLogRepo.create({
          userId: req.user.userId,
          userRole: req.user.role,
          action: "DEPARTMENT_DELETED",
          entity: "Department",
          entityId: id,
          details: { name: department.name },
        });
      }

      sendSuccess(res, `Department "${department.name}" deleted successfully.`);
    } catch (err) {
      next(err);
    }
  };
}
