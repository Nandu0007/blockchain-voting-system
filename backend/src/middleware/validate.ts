import type { NextFunction, Request, Response } from 'express';
import type Joi from 'joi';
import { HttpError } from '../utils/httpError';

interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

export const validate = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const checks: Array<keyof ValidationSchema> = ['body', 'query', 'params'];

    for (const key of checks) {
      const validator = schema[key];
      if (!validator) {
        continue;
      }

      const { error, value } = validator.validate(req[key], {
        abortEarly: false,
        allowUnknown: key !== 'body',
        stripUnknown: key === 'body',
      });

      if (error) {
        throw new HttpError(400, 'Validation failed', {
          source: key,
          issues: error.details.map((detail) => detail.message),
        });
      }

      Object.assign(req[key], value);
    }

    next();
  };
};
