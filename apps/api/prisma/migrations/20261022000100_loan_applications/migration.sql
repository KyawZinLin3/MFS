CREATE TABLE "LoanApplication" (
  "id" TEXT NOT NULL,
  "applicationNumber" TEXT NOT NULL,
  "applicantName" TEXT NOT NULL,
  "phone" TEXT,
  "nationalId" TEXT,
  "loanType" TEXT NOT NULL,
  "loanAmount" DECIMAL(14,2),
  "tenureMonths" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "applicationData" JSONB NOT NULL,
  "companyId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "customerAccountId" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoanApplication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LoanApplication_applicationNumber_key" ON "LoanApplication"("applicationNumber");
CREATE INDEX "LoanApplication_companyId_branchId_createdAt_idx" ON "LoanApplication"("companyId", "branchId", "createdAt");
CREATE INDEX "LoanApplication_companyId_status_createdAt_idx" ON "LoanApplication"("companyId", "status", "createdAt");
CREATE INDEX "LoanApplication_applicantName_idx" ON "LoanApplication"("applicantName");
CREATE INDEX "LoanApplication_customerAccountId_idx" ON "LoanApplication"("customerAccountId");
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
