import type { FastifyRequest } from 'fastify';
import type { Role } from '@prisma/client';
import { AppError } from './errors.js';

export type Principal = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  branchIds: string[];
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: Principal;
    user: Principal;
  }
}

export const permissions: Record<Role, string[]> = {
  PLATFORM_ADMIN: ['*'],
  COMPANY_ADMIN: ['dashboard:read', 'branches:read', 'team:read', 'audit:read', 'transfers:read', 'documents:read', 'documents:write', 'customers:read', 'customers:write', 'customers:credentials:read', 'loanApplications:read', 'loanApplications:write'],
  BRANCH_MANAGER: ['dashboard:read', 'branches:read', 'team:read', 'audit:read', 'transfers:read', 'documents:read', 'documents:write', 'customers:read', 'customers:write', 'customers:credentials:read', 'loanApplications:read', 'loanApplications:write'],
  OPERATOR: ['dashboard:read', 'branches:read', 'transfers:read', 'documents:read', 'documents:write', 'customers:read', 'customers:write', 'customers:credentials:read', 'loanApplications:read', 'loanApplications:write'],
  AUDITOR: ['dashboard:read', 'branches:read', 'audit:read', 'transfers:read', 'documents:read', 'loanApplications:read'],
};

export function assertPermission(request: FastifyRequest, permission: string): void {
  const allowed = permissions[request.user.role] ?? [];
  if (!allowed.includes('*') && !allowed.includes(permission)) {
    throw new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN');
  }
}

export async function authenticate(request: FastifyRequest): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError('Please sign in to continue.', 401, 'UNAUTHENTICATED');
  }
}

export function dataScope(principal: Principal, branchId?: string): { companyId?: string; branchId?: string | { in: string[] } } {
  if (principal.role === 'PLATFORM_ADMIN') {
    return branchId ? { branchId } : {};
  }
  if (!principal.companyId) throw new AppError('Your account is not assigned to a company.', 403, 'SCOPE_REQUIRED');
  const scope: Record<string, unknown> = { companyId: principal.companyId };
  if (branchId) {
    if (principal.role !== 'COMPANY_ADMIN' && !principal.branchIds.includes(branchId)) {
      throw new AppError('This branch is outside your access scope.', 403, 'OUT_OF_SCOPE');
    }
    scope.branchId = branchId;
  } else if (principal.role !== 'COMPANY_ADMIN') {
    scope.branchId = { in: principal.branchIds };
  }
  return scope;
}
