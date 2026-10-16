import { Request, Response, NextFunction } from "express";
import { IAuditLogRepository } from "../repositories/interfaces/IAuditLogRepository";
import { sendSuccess } from "../utils/response";

export class AuditLogController {
  constructor(private auditLogRepo: IAuditLogRepository) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

      const { logs, total } = await this.auditLogRepo.findAll(limit, page);
      sendSuccess(res, "Audit logs retrieved successfully", logs, 200, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  };
}
