import type { FastifyInstance } from 'fastify';
import { TransferStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../shared/errors.js';
import { assertPermission, authenticate, dataScope } from '../../shared/rbac.js';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(120).optional(),
  status: z.nativeEnum(TransferStatus).optional(),
  companyId: z.string().optional(),
  branchId: z.string().optional(),
});

export async function transfersRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'transfers:read');
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw new AppError('Invalid transfer filters.', 400, 'VALIDATION_ERROR');
    const { page, pageSize, search, status, companyId, branchId } = parsed.data;
    if (companyId && request.user.role !== 'PLATFORM_ADMIN' && companyId !== request.user.companyId) throw new AppError('This company is outside your access scope.', 403, 'OUT_OF_SCOPE');
    const scope = dataScope(request.user, branchId);
    if (request.user.role === 'PLATFORM_ADMIN' && companyId) scope.companyId = companyId;
    const where = { ...scope, ...(status ? { status } : {}), ...(search ? { OR: [{ reference: { contains: search, mode: 'insensitive' as const } }, { customer: { contains: search, mode: 'insensitive' as const } }] } : {}) };
    const [total, items] = await Promise.all([
      prisma.transfer.count({ where }),
      prisma.transfer.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { branch: { select: { name: true } } } }),
    ]);
    return {
      items: items.map((item) => ({ id: item.id, reference: item.reference, customer: item.customer, destination: item.destination, amount: Number(item.amount), currency: item.currency, status: item.status, branch: item.branch.name, createdAt: item.createdAt })),
      page, pageSize, total,
    };
  });
}
