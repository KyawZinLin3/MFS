import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma.js';
import { AppError } from '../../shared/errors.js';
import { assertPermission, authenticate, dataScope, type Principal } from '../../shared/rbac.js';

const payloadSchema = z.object({
  branchId: z.string().min(1).optional(),
  applicationData: z.record(z.string(), z.unknown()),
  submit: z.boolean().default(false),
});
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const number = (value: unknown) => typeof value === 'number' ? value : Number(value);

function applicationFields(data: Record<string, unknown>) {
  return {
    applicantName: text(data.fullNameEnglish) || text(data.fullNameMyanmar),
    phone: text(data.phoneMobile) || null,
    nationalId: text(data.nationalId) || null,
    loanType: text(data.loanType) || 'CREDIT_LOAN',
    loanAmount: Number.isFinite(number(data.loanAmount)) && number(data.loanAmount) > 0 ? number(data.loanAmount) : null,
    tenureMonths: Number.isInteger(number(data.tenureMonths)) && number(data.tenureMonths) > 0 ? number(data.tenureMonths) : null,
  };
}

function validateForSubmission(data: Record<string, unknown>) {
  const fields = applicationFields(data);
  if (!['CREDIT_LOAN', 'ENERGY_LOAN', 'STAFF_LOAN'].includes(fields.loanType)) throw new AppError('Choose a valid loan product.', 400, 'VALIDATION_ERROR');
  if (fields.applicantName.length < 2) throw new AppError('Enter the applicant’s name before submitting.', 400, 'VALIDATION_ERROR');
  if (!fields.phone || fields.phone.replace(/\D/g, '').length < 7) throw new AppError('Enter a valid applicant phone number.', 400, 'VALIDATION_ERROR');
  if (!fields.nationalId || fields.nationalId.length < 4) throw new AppError('Enter the applicant’s national ID number.', 400, 'VALIDATION_ERROR');
  if (!text(data.currentAddress)) throw new AppError('Enter the applicant’s current address.', 400, 'VALIDATION_ERROR');
  if (!fields.loanAmount) throw new AppError('Enter the requested loan amount.', 400, 'VALIDATION_ERROR');
  if (!fields.tenureMonths) throw new AppError('Choose a loan term.', 400, 'VALIDATION_ERROR');
  if (!text(data.loanPurpose) && !text(data.loanPurposeOther)) throw new AppError('Choose or enter the loan purpose.', 400, 'VALIDATION_ERROR');
  if (data.applicantConfirmed !== true) throw new AppError('Confirm that the application details were reviewed with the applicant.', 400, 'VALIDATION_ERROR');
  return fields;
}

function assertBranchAccess(request: { user: Principal }, branchId: string, companyId: string) {
  const scope = dataScope(request.user, branchId);
  if (scope.companyId && scope.companyId !== companyId) throw new AppError('This branch is outside your access scope.', 403, 'OUT_OF_SCOPE');
  if (typeof scope.branchId === 'string' && scope.branchId !== branchId) throw new AppError('This branch is outside your access scope.', 403, 'OUT_OF_SCOPE');
}

async function validateCustomerLink(request: { user: Principal }, applicationData: Record<string, unknown>, companyId: string) {
  const customerAccountId = text(applicationData.customerAccountId);
  if (!customerAccountId) return null;
  const customer = await prisma.customerAccount.findUnique({ where: { id: customerAccountId }, select: { id: true, companyId: true, branchId: true } });
  if (!customer || customer.companyId !== companyId) throw new AppError('Choose a customer account in this company.', 400, 'INVALID_CUSTOMER');
  assertBranchAccess(request, customer.branchId, customer.companyId);
  return customer.id;
}

async function writeAudit(userId: string, companyId: string, branchId: string, action: string, id: string, ipAddress: string) {
  await prisma.auditLog.create({ data: { userId, companyId, branchId, action, entityType: 'loan_application', entityId: id, ipAddress } });
}

export async function loanApplicationsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'loanApplications:read');
    const parsed = z.object({ companyId: z.string().optional(), branchId: z.string().optional(), search: z.string().trim().max(120).optional(), status: z.enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'DECLINED']).optional() }).safeParse(request.query);
    if (!parsed.success) throw new AppError('Invalid loan application filters.', 400, 'VALIDATION_ERROR');
    const { companyId, branchId, search, status } = parsed.data;
    if (companyId && request.user.role !== 'PLATFORM_ADMIN' && companyId !== request.user.companyId) throw new AppError('This company is outside your access scope.', 403, 'OUT_OF_SCOPE');
    const scope = dataScope(request.user, branchId);
    if (request.user.role === 'PLATFORM_ADMIN' && companyId) scope.companyId = companyId;
    const where = { ...scope, ...(status ? { status } : {}), ...(search ? { OR: [
      { applicationNumber: { contains: search, mode: 'insensitive' as const } },
      { applicantName: { contains: search, mode: 'insensitive' as const } },
      { phone: { contains: search } },
    ] } : {}) };
    const items = await prisma.loanApplication.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 150, include: { branch: { select: { name: true } } } });
    return items.map(({ id, applicationNumber, applicantName, phone, loanType, loanAmount, tenureMonths, status: applicationStatus, createdAt, updatedAt, branch }) => ({
      id, applicationNumber, applicantName, phone, loanType, loanAmount: loanAmount === null ? null : Number(loanAmount), tenureMonths, status: applicationStatus, createdAt, updatedAt, branch: branch.name,
    }));
  });

  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    assertPermission(request, 'loanApplications:write');
    const parsed = payloadSchema.safeParse(request.body);
    if (!parsed.success || !parsed.data.branchId) throw new AppError('Choose a branch for this application.', 400, 'VALIDATION_ERROR');
    const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
    if (!branch || branch.status !== 'ACTIVE') throw new AppError('Choose an active branch.', 400, 'INVALID_BRANCH');
    assertBranchAccess(request, branch.id, branch.companyId);
    const customerAccountId = await validateCustomerLink(request, parsed.data.applicationData, branch.companyId);
    const fields = parsed.data.submit ? validateForSubmission(parsed.data.applicationData) : applicationFields(parsed.data.applicationData);
    const application = await prisma.loanApplication.create({ data: {
      applicationNumber: `LA-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      ...fields, status: parsed.data.submit ? 'SUBMITTED' : 'DRAFT', applicationData: parsed.data.applicationData as Prisma.InputJsonValue,
      companyId: branch.companyId, branchId: branch.id, customerAccountId, createdBy: request.user.sub,
    } });
    await writeAudit(request.user.sub, branch.companyId, branch.id, parsed.data.submit ? 'loan.application.submitted' : 'loan.application.draft_saved', application.id, request.ip);
    return reply.status(201).send({ id: application.id, applicationNumber: application.applicationNumber, status: application.status });
  });

  app.get('/:id', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'loanApplications:read');
    const parsed = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!parsed.success) throw new AppError('Loan application was not found.', 404, 'NOT_FOUND');
    const application = await prisma.loanApplication.findUnique({ where: { id: parsed.data.id }, include: { branch: { select: { name: true } } } });
    if (!application) throw new AppError('Loan application was not found.', 404, 'NOT_FOUND');
    assertBranchAccess(request, application.branchId, application.companyId);
    return { id: application.id, applicationNumber: application.applicationNumber, status: application.status, branchId: application.branchId, branch: application.branch.name, applicationData: application.applicationData };
  });

  app.patch('/:id', { preHandler: authenticate }, async (request) => {
    assertPermission(request, 'loanApplications:write');
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const parsed = payloadSchema.omit({ branchId: true }).safeParse(request.body);
    if (!params.success || !parsed.success) throw new AppError('Invalid loan application update.', 400, 'VALIDATION_ERROR');
    const existing = await prisma.loanApplication.findUnique({ where: { id: params.data.id } });
    if (!existing) throw new AppError('Loan application was not found.', 404, 'NOT_FOUND');
    assertBranchAccess(request, existing.branchId, existing.companyId);
    if (existing.status !== 'DRAFT') throw new AppError('Only draft applications can be edited.', 409, 'APPLICATION_LOCKED');
    const customerAccountId = await validateCustomerLink(request, parsed.data.applicationData, existing.companyId);
    const fields = parsed.data.submit ? validateForSubmission(parsed.data.applicationData) : applicationFields(parsed.data.applicationData);
    const updated = await prisma.loanApplication.update({ where: { id: existing.id }, data: {
      ...fields, status: parsed.data.submit ? 'SUBMITTED' : 'DRAFT', applicationData: parsed.data.applicationData as Prisma.InputJsonValue, customerAccountId,
    } });
    await writeAudit(request.user.sub, existing.companyId, existing.branchId, parsed.data.submit ? 'loan.application.submitted' : 'loan.application.draft_saved', updated.id, request.ip);
    return { id: updated.id, applicationNumber: updated.applicationNumber, status: updated.status };
  });
}
