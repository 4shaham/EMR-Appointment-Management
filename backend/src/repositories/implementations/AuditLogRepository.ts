import { IAuditLog, AuditLogModel } from "../../models/AuditLog.model";
import {
  IAuditLogRepository,
  ICreateAuditLog,
} from "../interfaces/IAuditLogRepository";

export class AuditLogRepository implements IAuditLogRepository {
  async create(data: ICreateAuditLog): Promise<IAuditLog> {
    const log = new AuditLogModel(data);
    return log.save();
  }

  async findAll(limit = 50, page = 1): Promise<{ logs: IAuditLog[]; total: number }> {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLogModel.find()
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      AuditLogModel.countDocuments().exec(),
    ]);
    return { logs, total };
  }
}
