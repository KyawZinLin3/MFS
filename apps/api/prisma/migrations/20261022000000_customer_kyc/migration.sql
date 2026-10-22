CREATE TABLE "CustomerAccount" (
  "id" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "nationalId" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3) NOT NULL,
  "address" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "passwordEncrypted" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerAccount_accountNumber_key" ON "CustomerAccount"("accountNumber");
CREATE UNIQUE INDEX "CustomerAccount_phone_key" ON "CustomerAccount"("phone");
CREATE UNIQUE INDEX "CustomerAccount_nationalId_key" ON "CustomerAccount"("nationalId");
CREATE INDEX "CustomerAccount_companyId_branchId_createdAt_idx" ON "CustomerAccount"("companyId", "branchId", "createdAt");
CREATE INDEX "CustomerAccount_fullName_idx" ON "CustomerAccount"("fullName");
ALTER TABLE "CustomerAccount" ADD CONSTRAINT "CustomerAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerAccount" ADD CONSTRAINT "CustomerAccount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
