import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../shared/errors.js';
import { assertPermission, authenticate, dataScope } from '../../shared/rbac.js';

const onboardSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[0-9\s()-]{7,24}$/),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  nationalId: z.string().trim().min(4).max(60),
  dateOfBirth: z.string().date(),
  address: z.string().trim().min(5).max(500),
  branchId: z.string().min(1),
});

function credentialKey() {
  return scryptSync(process.env.CREDENTIAL_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? 'development-only-secret-change-before-deploying', 'mfs-customer-credentials', 32);
}

function encryptPassword(password: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', credentialKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

function decryptPassword(encrypted: string) {
  const value = Buffer.from(encrypted, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', credentialKey(), value.subarray(0, 12));
  decipher.setAuthTag(value.subarray(12, 28));
  return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString('utf8');
}

function initialPassword() {
  return `Mfs${randomBytes(7).toString('base64url')}!`;
}

function accountView(account: { id: string; accountNumber: string; fullName: string; phone: string; email: string | null; createdAt: Date; branch: { name: string } }) {
  return {
    id: account.id, accountNumber: account.accountNumber, fullName: account.fullName, phone: account.phone,
    email: account.email, branch: account.branch.name, createdAt: account.createdAt,
  };
}

export async function customersRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'customers:read');
    const parsed = z.object({ companyId: z.string().optional(), branchId: z.string().optional(), search: z.string().trim().max(120).optional() }).safeParse(request.query);
    if (!parsed.success) throw new AppError('Invalid customer filters.', 400, 'VALIDATION_ERROR');
    const { companyId, branchId, search } = parsed.data;
    if (companyId && request.user.role !== 'PLATFORM_ADMIN' && companyId !== request.user.companyId) throw new AppError('This company is outside your access scope.', 403, 'OUT_OF_SCOPE');
    const scope = dataScope(request.user, branchId);
    if (request.user.role === 'PLATFORM_ADMIN' && companyId) scope.companyId = companyId;
    const where = {
      ...scope,
      ...(search ? { OR: [
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { accountNumber: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ] } : {}),
    };
    const accounts = await prisma.customerAccount.findMany({ where, orderBy: { createdAt: 'desc' }, include: { branch: { select: { name: true } } } });
    return accounts.map(accountView);
  });

  app.post('/onboard', { preHandler: authenticate }, async (request, reply) => {
    assertPermission(request, 'customers:write');
    const parsed = onboardSchema.safeParse(request.body);
    if (!parsed.success) throw new AppError('Check the KYC details and try again.', 400, 'VALIDATION_ERROR');
    const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
    if (!branch || branch.status !== 'ACTIVE') throw new AppError('Choose an active branch.', 400, 'INVALID_BRANCH');
    const allowedScope = dataScope(request.user, branch.id);
    if (allowedScope.companyId && allowedScope.companyId !== branch.companyId) throw new AppError('This branch is outside your access scope.', 403, 'OUT_OF_SCOPE');
    const phone = parsed.data.phone.replace(/[\s()-]/g, '');
    if (await prisma.customerAccount.findFirst({ where: { OR: [{ phone }, { nationalId: parsed.data.nationalId }] } })) {
      throw new AppError('A customer account already exists for this phone number or national ID.', 409, 'CUSTOMER_EXISTS');
    }
    const password = initialPassword();
    const accountNumber = `MFS-${Date.now().toString().slice(-8)}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const account = await prisma.customerAccount.create({
      data: {
        accountNumber, fullName: parsed.data.fullName, phone, email: parsed.data.email || null,
        nationalId: parsed.data.nationalId, dateOfBirth: new Date(`${parsed.data.dateOfBirth}T00:00:00.000Z`),
        address: parsed.data.address, companyId: branch.companyId, branchId: branch.id,
        passwordHash: await bcrypt.hash(password, 12), passwordEncrypted: encryptPassword(password), createdBy: request.user.sub,
      },
      include: { branch: { select: { name: true } } },
    });
    await prisma.auditLog.create({ data: { userId: request.user.sub, companyId: branch.companyId, branchId: branch.id, action: 'customer.kyc.completed', entityType: 'customer', entityId: account.id, ipAddress: request.ip } });
    return reply.status(201).send({ ...accountView(account), credentials: { username: phone, password } });
  });

  app.get('/:id/kyc-summary', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'customers:read');
    const parsed = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!parsed.success) throw new AppError('Customer account was not found.', 404, 'NOT_FOUND');
    const account = await prisma.customerAccount.findUnique({ where: { id: parsed.data.id } });
    if (!account) throw new AppError('Customer account was not found.', 404, 'NOT_FOUND');
    const scope = dataScope(request.user, account.branchId);
    if ((scope.companyId && scope.companyId !== account.companyId) || (typeof scope.branchId === 'string' && scope.branchId !== account.branchId)) throw new AppError('This customer is outside your access scope.', 403, 'OUT_OF_SCOPE');
    return { fullName: account.fullName, phone: account.phone, nationalId: account.nationalId, dateOfBirth: account.dateOfBirth.toISOString().slice(0, 10), address: account.address };
  });

  app.get('/:id/credentials', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'customers:credentials:read');
    const parsed = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!parsed.success) throw new AppError('Customer account was not found.', 404, 'NOT_FOUND');
    const account = await prisma.customerAccount.findUnique({ where: { id: parsed.data.id }, include: { branch: { select: { name: true } } } });
    if (!account) throw new AppError('Customer account was not found.', 404, 'NOT_FOUND');
    const scope = dataScope(request.user, account.branchId);
    if ((scope.companyId && scope.companyId !== account.companyId) || (typeof scope.branchId === 'string' && scope.branchId !== account.branchId)) throw new AppError('This customer is outside your access scope.', 403, 'OUT_OF_SCOPE');
    await prisma.auditLog.create({ data: { userId: request.user.sub, companyId: account.companyId, branchId: account.branchId, action: 'customer.credentials.shared', entityType: 'customer', entityId: account.id, ipAddress: request.ip } });
    return { accountNumber: account.accountNumber, fullName: account.fullName, phone: account.phone, password: decryptPassword(account.passwordEncrypted) };
  });
}
