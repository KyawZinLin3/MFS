import type { FastifyInstance } from 'fastify';
import { Prisma, TransferStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../shared/errors.js';
import { assertPermission, authenticate, dataScope } from '../../shared/rbac.js';

const querySchema = z.object({ companyId: z.string().optional(), branchId: z.string().optional() });
const money = (value: number) => Math.round(value * 100) / 100;

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'dashboard:read');
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw new AppError('Invalid dashboard filters.', 400, 'VALIDATION_ERROR');
    const { companyId, branchId } = parsed.data;
    if (companyId && request.user.role !== 'PLATFORM_ADMIN' && companyId !== request.user.companyId) {
      throw new AppError('This company is outside your access scope.', 403, 'OUT_OF_SCOPE');
    }
    const scope = dataScope(request.user, branchId);
    if (request.user.role === 'PLATFORM_ADMIN' && companyId) scope.companyId = companyId;
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const where = { ...scope, createdAt: { gte: since } };
    const trendFilters: Prisma.Sql[] = [Prisma.sql`"createdAt" >= ${since}`, Prisma.sql`"status" = 'COMPLETED'`];
    if (scope.companyId) trendFilters.push(Prisma.sql`"companyId" = ${scope.companyId}`);
    if (typeof scope.branchId === 'string') trendFilters.push(Prisma.sql`"branchId" = ${scope.branchId}`);
    else if (scope.branchId?.in.length) trendFilters.push(Prisma.sql`"branchId" IN (${Prisma.join(scope.branchId.in)})`);
    else if (scope.branchId) trendFilters.push(Prisma.sql`FALSE`);
    const [total, volume, statuses, transfers, branches, users, audit, trend] = await Promise.all([
      prisma.transfer.count({ where }),
      prisma.transfer.aggregate({ where: { ...where, status: TransferStatus.COMPLETED }, _sum: { amount: true } }),
      prisma.transfer.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.transfer.findMany({ where, orderBy: { createdAt: 'desc' }, take: 8, include: { branch: { select: { name: true } } } }),
      prisma.branch.count({ where: { companyId: scope.companyId as string | undefined, ...(scope.branchId ? { id: scope.branchId as string } : {}), status: 'ACTIVE' } }),
      request.user.role === 'PLATFORM_ADMIN'
        ? prisma.user.count({ where: companyId ? { companyId } : {} })
        : prisma.user.count({ where: { companyId: request.user.companyId, ...(request.user.role === 'BRANCH_MANAGER' || request.user.role === 'OPERATOR' ? { branches: { some: { branchId: { in: request.user.branchIds } } } } : {}) } }),
      prisma.auditLog.findMany({ where: { ...scope }, orderBy: { createdAt: 'desc' }, take: 5, include: { user: { select: { name: true } } } }),
      prisma.$queryRaw<{ day: Date; volume: Prisma.Decimal; count: bigint }[]>(Prisma.sql`SELECT date_trunc('day', "createdAt") AS day, COALESCE(SUM(amount), 0) AS volume, COUNT(*) AS count FROM "Transfer" WHERE ${Prisma.join(trendFilters, ' AND ')} GROUP BY 1 ORDER BY 1`),
    ]);
    const statusCounts = Object.fromEntries(statuses.map((item) => [item.status.toLowerCase(), item._count._all]));
    return {
      metrics: {
        transfers: total,
        volume: money(Number(volume._sum.amount ?? 0)),
        completionRate: total ? Math.round(((statusCounts.completed ?? 0) / total) * 1000) / 10 : 0,
        activeBranches: branches,
        teamMembers: users,
        pendingReview: statusCounts.review ?? 0,
      },
      statuses: statusCounts,
      trend: trend.map((item) => ({ day: item.day, volume: Number(item.volume), count: Number(item.count) })),
      transfers: transfers.map((item) => ({
        id: item.id, reference: item.reference, customer: item.customer, destination: item.destination,
        amount: Number(item.amount), currency: item.currency, status: item.status, branch: item.branch.name, createdAt: item.createdAt,
      })),
      activity: audit.map((item) => ({ id: item.id, action: item.action, actor: item.user?.name ?? 'System', entity: item.entityType, createdAt: item.createdAt })),
    };
  });
}
