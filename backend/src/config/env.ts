import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),
  LOG_LEVEL: Joi.string().default('info'),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('2h'),
  CORS_ORIGIN: Joi.string().default('*'),
  API_VERSION: Joi.string().default('v1'),
}).unknown(true);

const { error, value } = schema.validate(process.env, { abortEarly: false, convert: true });

if (error) {
  throw new Error(`Environment validation failed: ${error.message}`);
}

export const env = {
  nodeEnv: value.NODE_ENV as 'development' | 'test' | 'production',
  port: Number(value.PORT),
  logLevel: value.LOG_LEVEL as string,
  jwtSecret: value.JWT_SECRET as string,
  jwtExpiresIn: value.JWT_EXPIRES_IN as string,
  corsOrigin: value.CORS_ORIGIN as string,
  apiVersion: value.API_VERSION as string,
};
