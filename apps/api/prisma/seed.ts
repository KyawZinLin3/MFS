import { PrismaClient, Role, TransferStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({ where: { code: 'YANGON' }, update: {}, create: { id: 'company-yangon', name: 'MFS Myanmar', code: 'YANGON' } });
  const otherCompany = await prisma.company.upsert({ where: { code: 'MANDALAY' }, update: {}, create: { id: 'company-mandalay', name: 'MFS Mandalay', code: 'MANDALAY' } });
  const branchSeeds = [
    { id: 'branch-ygn-01', code: 'YGN-01', name: 'Downtown Yangon', city: 'Yangon', companyId: company.id },
    { id: 'branch-ygn-02', code: 'YGN-02', name: 'Insein', city: 'Yangon', companyId: company.id },
    { id: 'branch-mdl-01', code: 'MDL-01', name: 'Chanayethazan', city: 'Mandalay', companyId: otherCompany.id },
  ];
  for (const branch of branchSeeds) await prisma.branch.upsert({ where: { id: branch.id }, update: branch, create: branch });
  const passwordHash = await bcrypt.hash('Welcome123!', 12);
  const users = [
    { id: 'user-admin', email: 'admin@mfs.local', name: 'MFS Administrator', role: Role.PLATFORM_ADMIN, companyId: null },
    { id: 'user-company', email: 'manager@mfs.local', name: 'Thiri Aung', role: Role.COMPANY_ADMIN, companyId: company.id },
    { id: 'user-operator', email: 'operator@mfs.local', name: 'Ko Min Thu', role: Role.OPERATOR, companyId: company.id },
    { id: 'user-auditor', email: 'auditor@mfs.local', name: 'May Thu', role: Role.AUDITOR, companyId: company.id },
  ];
  for (const user of users) {
    await prisma.user.upsert({ where: { email: user.email }, update: { name: user.name, role: user.role, companyId: user.companyId, passwordHash, active: true }, create: { ...user, passwordHash } });
  }
  const operator = await prisma.user.findUniqueOrThrow({ where: { email: 'operator@mfs.local' } });
  await prisma.userBranch.upsert({ where: { userId_branchId: { userId: operator.id, branchId: 'branch-ygn-01' } }, update: {}, create: { userId: operator.id, branchId: 'branch-ygn-01' } });
  const companyAdmin = await prisma.user.findUniqueOrThrow({ where: { email: 'manager@mfs.local' } });
  for (const branch of ['branch-ygn-01', 'branch-ygn-02']) await prisma.userBranch.upsert({ where: { userId_branchId: { userId: companyAdmin.id, branchId: branch } }, update: {}, create: { userId: companyAdmin.id, branchId: branch } });
  const auditors = await prisma.user.findUniqueOrThrow({ where: { email: 'auditor@mfs.local' } });
  await prisma.userBranch.upsert({ where: { userId_branchId: { userId: auditors.id, branchId: 'branch-ygn-01' } }, update: {}, create: { userId: auditors.id, branchId: 'branch-ygn-01' } });

  const sample = [
    ['TX-840291', 'Aye Chan', 'Thailand', 850, TransferStatus.COMPLETED, 'branch-ygn-01', 1],
    ['TX-840290', 'Htet Htet', 'Singapore', 1250, TransferStatus.PROCESSING, 'branch-ygn-02', 2],
    ['TX-840289', 'Nay Lin', 'Japan', 420, TransferStatus.PENDING, 'branch-ygn-01', 3],
    ['TX-840288', 'Ei Mon', 'Malaysia', 2100, TransferStatus.COMPLETED, 'branch-ygn-02', 4],
    ['TX-840287', 'Kyaw Zin', 'Thailand', 680, TransferStatus.REVIEW, 'branch-ygn-01', 5],
    ['TX-840286', 'Su Su', 'South Korea', 930, TransferStatus.COMPLETED, 'branch-ygn-01', 7],
    ['TX-840285', 'Aung Myo', 'Singapore', 1540, TransferStatus.FAILED, 'branch-ygn-02', 8],
    ['TX-840284', 'Nandar', 'United Kingdom', 3200, TransferStatus.COMPLETED, 'branch-ygn-02', 9],
    ['TX-840283', 'Hla Win', 'Thailand', 540, TransferStatus.PENDING, 'branch-ygn-01', 10],
    ['TX-840282', 'Mya Mya', 'Malaysia', 760, TransferStatus.COMPLETED, 'branch-ygn-01', 11],
    ['TX-840281', 'Zaw Zaw', 'Japan', 1890, TransferStatus.COMPLETED, 'branch-ygn-02', 13],
    ['TX-840280', 'Khin Khin', 'Singapore', 1100, TransferStatus.PROCESSING, 'branch-ygn-01', 15],
  ] as const;
  for (const [reference, customer, destination, amount, status, branchId, daysAgo] of sample) {
    const createdAt = new Date(Date.now() - daysAgo * 86_400_000);
    await prisma.transfer.upsert({ where: { reference }, update: {}, create: { reference, customer, destination, amount, status, branchId, companyId: company.id, createdAt } });
  }
  const existingAudit = await prisma.auditLog.count({ where: { companyId: company.id } });
  if (!existingAudit) {
    await prisma.auditLog.createMany({ data: [
      { userId: companyAdmin.id, companyId: company.id, branchId: 'branch-ygn-01', action: 'branch.settings.updated', entityType: 'branch', entityId: 'branch-ygn-01', createdAt: new Date(Date.now() - 18 * 60_000) },
      { userId: operator.id, companyId: company.id, branchId: 'branch-ygn-02', action: 'transfer.created', entityType: 'transfer', entityId: 'TX-840290', createdAt: new Date(Date.now() - 52 * 60_000) },
      { userId: auditors.id, companyId: company.id, branchId: 'branch-ygn-01', action: 'report.exported', entityType: 'report', createdAt: new Date(Date.now() - 2 * 3_600_000) },
    ] });
  }
  console.log('Seeded portal demo data.');
}

main().finally(() => prisma.$disconnect());
