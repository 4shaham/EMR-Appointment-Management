import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types";
import { AppError } from "../utils/AppError";

/**
 * Role-based access control middleware factory.
 * Usage: authorize("super_admin", "receptionist")
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role(s): ${allowedRoles.join(", ")}.`,
          403
        )
      );
    }

    next();
  };
}
