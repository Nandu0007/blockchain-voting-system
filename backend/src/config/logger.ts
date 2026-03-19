import fs from 'fs';
import path from 'path';
import Winston from 'winston';

const logDirectory = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const logFormat = process.env.NODE_ENV === 'production'
  ? Winston.format.combine(Winston.format.timestamp(), Winston.format.errors({ stack: true }), Winston.format.json())
  : Winston.format.combine(
      Winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      Winston.format.errors({ stack: true }),
      Winston.format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
      }),
    );

const logger = Winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'voting-api' },
  transports: [
    new Winston.transports.Console(),
    new Winston.transports.File({ filename: path.join(logDirectory, 'error.log'), level: 'error' }),
    new Winston.transports.File({ filename: path.join(logDirectory, 'combined.log') }),
  ],
});

export default logger;
