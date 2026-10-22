import type { FastifyInstance } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma.js';
import { assertPermission, authenticate, dataScope } from '../../shared/rbac.js';

export async function organizationRoutes(app: FastifyInstance) {
  app.get('/branches', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'branches:read');
    const scope = dataScope(request.user);
    return prisma.branch.findMany({ where: { ...(scope.companyId ? { companyId: scope.companyId } : {}), ...(scope.branchId ? { id: scope.branchId } : {}) }, orderBy: [{ city: 'asc' }, { name: 'asc' }], select: { id: true, name: true, code: true, city: true, status: true, companyId: true } });
  });

  app.get('/team', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'team:read');
    const scope = dataScope(request.user);
    const users = await prisma.user.findMany({
      where: { ...(scope.companyId ? { companyId: scope.companyId as string } : {}), ...(request.user.role === 'BRANCH_MANAGER' ? { branches: { some: { branchId: { in: request.user.branchIds } } } } : {}) },
      orderBy: { name: 'asc' }, take: 50,
      include: { branches: { include: { branch: { select: { name: true } } } }, company: { select: { name: true } } },
    });
    return users.map(({ id, email, name, role, active, company, branches }) => ({ id, email, name, role, active, company: company?.name ?? 'Platform', branches: branches.map((item) => item.branch.name) }));
  });

  app.get('/companies', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'branches:read');
    if (request.user.role !== 'PLATFORM_ADMIN') {
      return prisma.company.findMany({ where: { id: request.user.companyId ?? '' }, select: { id: true, name: true, code: true, status: true } });
    }
    return prisma.company.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true, status: true } });
  });
}
