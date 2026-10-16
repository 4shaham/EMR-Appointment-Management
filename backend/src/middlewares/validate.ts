import { Request, Response, NextFunction } from "express";
import { ZodError, ZodSchema } from "zod";

/**
 * Middleware factory that validates req.body, req.query, or req.params
 * against a Zod schema. Throws ZodError on failure (caught by errorHandler).
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return next(result.error);
    }

    // Attach parsed (coerced/transformed) data back to the request
    const parsed = result.data as {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };

    if (parsed.body !== undefined) req.body = parsed.body;
    if (
      parsed.query !== undefined &&
      typeof parsed.query === "object" &&
      parsed.query !== null
    ) {
      for (const key of Object.keys(req.query)) {
        delete (req.query as Record<string, unknown>)[key];
      }
      Object.assign(req.query, parsed.query);
    }

    next();
  };
}
