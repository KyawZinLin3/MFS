import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../shared/errors.js';
import { authenticate } from '../../shared/rbac.js';

const loginSchema = z.object({ email: z.string().email().transform((value) => value.toLowerCase()), password: z.string().min(1) });

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) throw new AppError('Enter a valid email and password.', 400, 'VALIDATION_ERROR');
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: { branches: { select: { branchId: true } } },
    });
    if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      throw new AppError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
    }
    const principal = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      branchIds: user.branches.map(({ branchId }) => branchId),
    };
    const token = app.jwt.sign(principal, { expiresIn: '30m' });
    await prisma.auditLog.create({ data: { userId: user.id, companyId: user.companyId, action: 'auth.login', entityType: 'session', ipAddress: request.ip } });
    return reply.send({ accessToken: token, expiresIn: 1800, user: principal });
  });

  app.get('/me', { preHandler: authenticate }, async (request) => request.user);
}
