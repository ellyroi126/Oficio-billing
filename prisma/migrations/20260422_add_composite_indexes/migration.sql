-- Add composite indexes for query performance

-- Contract indexes
CREATE INDEX IF NOT EXISTS "Contract_status_deletedAt_endDate_idx" ON "Contract"("status", "deletedAt", "endDate");
CREATE INDEX IF NOT EXISTS "Contract_deletedAt_idx" ON "Contract"("deletedAt");

-- Invoice indexes
CREATE INDEX IF NOT EXISTS "Invoice_status_deletedAt_idx" ON "Invoice"("status", "deletedAt");
CREATE INDEX IF NOT EXISTS "Invoice_clientId_status_dueDate_idx" ON "Invoice"("clientId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "Invoice_deletedAt_idx" ON "Invoice"("deletedAt");

-- Payment indexes
CREATE INDEX IF NOT EXISTS "Payment_clientId_paymentDate_deletedAt_idx" ON "Payment"("clientId", "paymentDate", "deletedAt");
CREATE INDEX IF NOT EXISTS "Payment_deletedAt_idx" ON "Payment"("deletedAt");
