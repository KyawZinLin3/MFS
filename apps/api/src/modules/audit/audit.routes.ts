import type { FastifyInstance } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { assertPermission, authenticate, dataScope } from '../../shared/rbac.js';

export async function auditRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'audit:read');
    const rows = await prisma.auditLog.findMany({ where: dataScope(request.user), take: 100, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, email: true } } } });
    return rows.map(({ id, action, entityType, entityId, metadata, createdAt, user }) => ({ id, action, entityType, entityId, metadata, createdAt, user }));
  });
}
