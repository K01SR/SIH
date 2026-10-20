import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects, ZodError } from 'zod';

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

/**
 * Validates and coerces request input against a Zod schema.
 * On failure returns a structured 422 response with per-field messages.
 */
export const validate =
  (schema: Schema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      // Express 4 request properties are writable; assign coerced values back.
      (req as unknown as Record<string, unknown>)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      next(err);
    }
  };
