import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes';
import { env } from './config/env';
import logger from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers';
import { requestIdMiddleware } from './middleware/requestId';
import { ok } from './utils/apiResponse';

const app: Express = express();
const PORT = env.port;

// ============= MIDDLEWARE =============
app.use(helmet());
app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin }));
app.use(requestIdMiddleware);
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============= ROUTES =============
app.get('/health', (req: Request, res: Response) => {
  res.json(
    ok(
      {
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        environment: env.nodeEnv,
      },
      req.requestId,
    ),
  );
});

app.get('/api/v1/status', (req: Request, res: Response) => {
  res.json(
    ok(
      {
        service: 'Blockchain Voting System API',
        version: '1.0.0',
        environment: env.nodeEnv,
      },
      req.requestId,
    ),
  );
});

app.use(`/api/${env.apiVersion}`, apiRoutes);

// ============= ERROR HANDLING =============
app.use(notFoundHandler);
app.use(errorHandler);

// ============= SERVER START =============
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${env.nodeEnv}`);
});

export default app;
