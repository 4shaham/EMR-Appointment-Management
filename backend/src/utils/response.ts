import { Response } from "express";
import { ApiResponse, PaginationMeta } from "../types";

export function sendSuccess<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
  meta?: PaginationMeta
): Response {
  const response: ApiResponse<T> = { success: true, message, data, meta };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: unknown
): Response {
  const response: ApiResponse = { success: false, message };
  if (errors) (response as unknown as Record<string, unknown>).errors = errors;
  return res.status(statusCode).json(response);
}
