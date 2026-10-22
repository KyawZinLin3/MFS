import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { prisma } from './infrastructure/database/prisma.js';
import { AppError } from './shared/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { organizationRoutes } from './modules/organization/organization.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { storageRoutes } from './modules/storage/storage.routes.js';
import { transfersRoutes } from './modules/transfers/transfers.routes.js';
import { customersRoutes } from './modules/customers/customers.routes.js';
import { loanApplicationsRoutes } from './modules/loan-applications/loan-applications.routes.js';
import { SpanStatusCode, trace } from '@opentelemetry/api';

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' }, trustProxy: true });
  const tracer = trace.getTracer('mfs-portal-api');
  app.addHook('onRequest', async (request) => {
    const span = tracer.startSpan(`${request.method} ${request.routeOptions.url ?? request.url}`);
    span.setAttribute('http.request.method', request.method);
    span.setAttribute('url.path', request.url.split('?')[0]);
    span.setAttribute('http.route', request.routeOptions.url ?? 'unmatched');
    (request as typeof request & { telemetrySpan?: typeof span }).telemetrySpan = span;
  });
  app.addHook('onResponse', async (request, reply) => {
    const span = (request as typeof request & { telemetrySpan?: ReturnType<typeof tracer.startSpan> }).telemetrySpan;
    if (!span) return;
    span.setAttribute('http.response.status_code', reply.statusCode);
    if (reply.statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
  });
  await app.register(helmet);
  await app.register(cors, { origin: process.env.WEB_ORIGIN?.split(',') ?? true, credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'development-only-secret-change-before-deploying' });
  app.get('/health', async (_request, reply) => {
    await prisma.$queryRaw`SELECT 1`;
    return reply.send({ status: 'ok', service: 'mfs-portal-api', timestamp: new Date().toISOString() });
  });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(organizationRoutes, { prefix: '/api/organization' });
  await app.register(auditRoutes, { prefix: '/api/audit' });
  await app.register(storageRoutes, { prefix: '/api/files' });
  await app.register(transfersRoutes, { prefix: '/api/transfers' });
  await app.register(customersRoutes, { prefix: '/api/customers' });
  await app.register(loanApplicationsRoutes, { prefix: '/api/loan-applications' });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn({ code: error.code }, error.message);
      return reply.status(error.statusCode).send({ error: { code: error.code, message: error.message } });
    }
    request.log.error({ err: error }, 'Unhandled request error');
    const status = typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number' && error.statusCode < 500 ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Request failed.';
    return reply.status(status).send({ error: { code: 'INTERNAL_ERROR', message: status === 500 ? 'Something went wrong.' : message } });
  });
  app.addHook('onClose', async () => prisma.$disconnect());
  return app;
}
