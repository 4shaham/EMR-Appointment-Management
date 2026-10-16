import { IAuditLog } from "../../models/AuditLog.model";
import { AuditAction, UserRole } from "../../types";

export interface ICreateAuditLog {
  userId: string;
  userRole: UserRole;
  action: AuditAction;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface IAuditLogRepository {
  create(data: ICreateAuditLog): Promise<IAuditLog>;
  findAll(limit?: number, page?: number): Promise<{ logs: IAuditLog[]; total: number }>;
}
