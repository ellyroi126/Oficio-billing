-- Add soft delete column to Client, Contract, Invoice, Payment
ALTER TABLE "Client" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Create indexes for soft delete queries
CREATE INDEX "Client_deletedAt_idx" ON "Client"("deletedAt");
CREATE INDEX "Contract_deletedAt_idx" ON "Contract"("deletedAt");
CREATE INDEX "Invoice_deletedAt_idx" ON "Invoice"("deletedAt");
CREATE INDEX "Payment_deletedAt_idx" ON "Payment"("deletedAt");
