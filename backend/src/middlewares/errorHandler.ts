import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  stack?: string;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = "Internal server error";
  let errors: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    message = "Validation failed";
    errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  } else if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    message = "Duplicate entry. Resource already exists.";
  } else {
    // Unexpected error — log it server-side, hide details from client
    console.error("[ErrorHandler] Unexpected error:", err);
  }

  const response: ErrorResponse = { success: false, message };
  if (errors) response.errors = errors;

  // Only expose stack trace in development
  if (env.nodeEnv === "development" && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Wraps an async route handler to forward errors to next().
 * Eliminates try/catch boilerplate in controllers.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
