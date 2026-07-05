import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export interface ValidatedRequest extends Request {
  validated?: {
    body?: unknown;
    params?: unknown;
    query?: unknown;
  };
}

export const validateRequest = (schema: z.ZodType) => {
  return async (
    req: ValidatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validated = await schema.parseAsync(req.body);

      req.validated = {
        ...req.validated,
        body: validated,
      };

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          msg: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      next(error);
    }
  };
};

export const validateParams = (schema: z.ZodType) => {
  return async (
    req: ValidatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validated = await schema.parseAsync(req.params);

      req.validated = {
        ...req.validated,
        params: validated,
      };

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          msg: 'Invalid parameters',
          code: 'INVALID_PARAMS',
          errors: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      next(error);
    }
  };
};

export const validateQuery = (schema: z.ZodType) => {
  return async (
    req: ValidatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validated = await schema.parseAsync(req.query);

      req.validated = {
        ...req.validated,
        query: validated,
      };

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          msg: 'Invalid query parameters',
          code: 'INVALID_QUERY',
          errors: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      next(error);
    }
  };
};