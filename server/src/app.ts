import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './modules/health/health.routes.js';
import { errorHandler, notFoundHandler } from './shared/middlewares/errorHandler.js';

export const app = express();

app.use(helmet());
// Credentials are required for the httpOnly auth cookie added in Phase 2.
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use('/api/v1/health', healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);
