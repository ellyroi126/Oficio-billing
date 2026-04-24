# Oficio Billing - Project Context

## Overview
Billing and contract management system for **Oficio Property Leasing**. Manages clients, lease contracts, invoices, payments, and receipts with role-based access control and approval workflows.

## Tech Stack
- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL via Prisma 7 ORM (hosted on Supabase)
- **Auth:** NextAuth.js v4 (JWT strategy, credentials provider)
- **File Storage:** Cloudflare R2 (S3-compatible)
- **Email:** Resend + Gmail SMTP (auto-fallback)
- **PDF Generation:** pdf-lib
- **DOCX Generation:** docx library
- **Excel:** xlsx (import/export)
- **Charts:** Recharts

## File Naming Conventions

### Contracts
- **Format:** `[ClientName] VO-SA [Year].[ext]`
- **Example:** `Servtrix Solutions Inc VO-SA 2026.pdf`
- **Signed copies:** `[ClientName] [ContractNumber] - Signed.pdf`
- **R2 path:** `contracts/[filename]`
- **Code:** `src/lib/file-storage.ts` → `generateContractFilename()`

### Invoices
- **Format:** `[ClientName]_[InvoiceNumber].pdf`
- **Example:** `Servtrix Solutions Inc_OFC00000219.pdf`
- **Invoice number format:** `OFC` + 8 digits (sequential from `OFC00000219`)
- **R2 path:** `invoices/[ClientCode]/[filename]`
- **Client code:** First word of client name, uppercase, max 10 chars (e.g., `SERVTRIX`)
- **Code:** `src/lib/invoice-storage.ts` → `generateInvoiceFilename()`

### Receipts
- **Receipt number:** `RCP-[last 8 chars of paymentId, uppercase]`
- **R2 path:** `receipts/[filename]`
- **Code:** `src/lib/receipt-pdf.ts` → `generateReceiptNumber()`

### Payment Evidence
- **R2 path:** `payments/[filename]`
- **Accepted types:** JPG, PNG, GIF, PDF (max 10MB)

## Key Business Rules

### Roles
- **ADMIN:** Full access. Can approve/reject requests, manage users, delete records, view audit logs, access company settings.
- **EMPLOYEE:** Limited access. Must request approval for: deletions, amount edits, contract termination/void, signer changes, company settings changes.

### Invoice Status Transitions
```
pending → sent → paid
                 ↓ (payment deleted)
                 sent
```
- `pending`: Just created
- `sent`: Marked as sent or emailed to client
- `overdue`: Auto-detected when dueDate < now (for pending/sent invoices)
- `paid`: Total payments >= invoice totalAmount

### Contract Statuses
`draft` → `active` (auto on mark-as-sent) → `expired` (auto via cron) / `terminated` / `void`

### VAT & Withholding Tax
- If `vatInclusive`: rentalRate already includes 12% VAT. Base = rate / 1.12, VAT = base × 0.12
- If not `vatInclusive`: Base = rate, VAT = rate × 0.12, Total = rate + VAT
- Optional 5% withholding tax on base amount (subtracted from total)

### Approval Workflow
Employees submit requests → Admins approve/reject → Approved actions execute automatically via `src/lib/executeApprovedAction.ts`

### Soft Delete
All main entities (clients, contracts, invoices, payments) support soft delete via `deletedAt` field. Recoverable from Trash page. Admin-only for permanent deletion.

## Database Models
- **Company** - Single company config (name, signers, automation settings)
- **Client** → **ClientContact** (1:many) - Tenants with contacts
- **Contract** - Lease contracts with DOCX/PDF/signed PDF paths
- **Invoice** - Billing with VAT/withholding tax
- **Payment** - Payment records with receipt generation
- **User** - ADMIN/EMPLOYEE roles
- **ApprovalRequest** - Pending/approved/rejected actions
- **AuditLog** / **AuthLog** - Activity tracking
- **EmailLog** - Email delivery tracking
- **Notification** - Persistent + virtual notifications

## Key File Paths

### API Routes (`src/app/api/`)
- `clients/` - Client CRUD, upload, template
- `contracts/` - Contract CRUD, batch, download, upload (signed)
- `invoices/` - Invoice CRUD, generate, regenerate, send, remind, download
- `payments/` - Payment CRUD, batch, upload (evidence), receipt
- `approvals/` - Approval CRUD, approve/reject
- `users/` - User management (admin)
- `user/` - Self-service profile/password
- `notifications/` - Get/mark-read
- `dashboard/` - Stats, needs-attention, activity
- `reports/` - Revenue, billing, contracts, renewals
- `cron/` - Auto-generate invoices, auto-expire contracts
- `company/` - Company settings
- `search/` - Global search
- `trash/` - Soft delete recovery

### Lib (`src/lib/`)
- `prisma.ts` - DB client singleton
- `file-storage.ts` - Contract file ops (R2)
- `invoice-storage.ts` - Invoice file ops (R2)
- `payment-storage.ts` - Payment evidence ops (R2)
- `receipt-storage.ts` - Receipt file ops (R2)
- `r2-storage.ts` - Low-level R2/S3 operations
- `invoice-pdf.ts` - Invoice PDF generation
- `receipt-pdf.ts` - Receipt PDF generation
- `contract-pdf.ts` - Contract PDF generation
- `contract-template.ts` - Contract DOCX generation
- `contract-expiry.ts` - Auto-expire contracts
- `email.ts` - Multi-provider email (Resend/Gmail)
- `email-gmail.ts` / `email-reminder-gmail.ts` - Gmail SMTP
- `email-reminder.ts` - Overdue reminder emails
- `auditLog.ts` - Audit logging
- `softDelete.ts` - Soft delete utilities
- `notifications.ts` - Virtual + persistent notifications
- `approvalRequest.ts` - Approval workflow
- `executeApprovedAction.ts` - Execute approved actions
- `middleware/roleCheck.ts` - Role-based access control
- `excel-export.ts` - Excel export
- `formatRelativeTime.ts` - Relative time formatting

### Components (`src/components/`)
- `layout/` - Sidebar, Header, SearchBar
- `clients/` - ClientTable, ClientForm, ClientTimeline, MassUploadModal
- `contracts/` - ContractTable, EditSignerModal, MarkAsSignedModal
- `invoices/` - InvoiceTable, InvoiceForm, InvoiceGenerateModal, SendInvoiceModal, SendReminderModal, EditInvoiceAmountModal, RegeneratePdfModal
- `payments/` - PaymentTable, PaymentForm, EditPaymentModal, PaymentEvidenceUpload
- `approvals/` - ApprovalCard, ApprovalRequestModal
- `notifications/` - NotificationDropdown
- `dashboard/` - NeedsAttentionCard, InvoiceAgingCard, RenewalAlertBanner
- `charts/` - RevenueLineChart, InvoiceStatusPieChart, TopClientsBarChart
- `profile/` - UserProfileModal
- `ui/` - Reusable UI components (Button, Card, Badge, Table, Input, Select, etc.)

### Contexts (`src/contexts/`)
- `RoleContext.tsx` - User role provider
- `ToastContext.tsx` - Toast notifications
- `ThemeContext.tsx` - Light/dark/system theme

## Contract Number Format
`VO-SA-[YYYY]-[NNNN]` (e.g., `VO-SA-2026-0001`). Sequential per year.

## Cron Jobs
- `POST /api/cron/generate-invoices` - Auto-generate invoices (requires `CRON_SECRET` header)
- `POST /api/cron/expire-contracts` - Auto-expire past-end-date contracts

## Security Notes
- All API routes require authentication (`requireAuth` or `requireAdmin`)
- Payment edits (all fields) require admin for direct changes; employees go through approval workflow
- Approval workflow: employees request, admins approve/reject; self-approval blocked; duplicate pending requests blocked
- CRON secret uses `crypto.timingSafeEqual` for timing-safe comparison
- Session maxAge: 8 hours (JWT strategy)
- bcrypt cost factor: 12
- Security headers configured in `next.config.ts` (X-Frame-Options, HSTS, nosniff, etc.)
- Email templates use HTML escaping for user data
- File uploads validate MIME type + size (PDF 20MB for contracts, 10MB for payment evidence)

## Known Limitations & Future Improvements

### Business Logic
- No "partially_paid" invoice status (partial payments leave invoice as "sent")
- No invoice write-off workflow (only delete)
- No credit/overpayment tracking
- Bank details, VAT rate (12%), withholding tax (5%), payment terms hardcoded in PDF templates
- Contract clauses hardcoded in `contract-pdf.ts` and `contract-template.ts`
- No auto-purge of soft-deleted items (trash UI no longer claims 30-day purge)
- No timeout/expiry on pending approval requests

### Email (Not Yet Configured)
- Invoice marked "sent" even if email delivery fails (fix when email is set up)
- No retry logic for failed emails
- No SMTP timeout configuration
- No attachment size validation before sending
- Reminder emails: no "partially paid" awareness

### Frontend / UX
- No skeleton loaders (uses spinners)
- No breadcrumbs on detail pages
- Pagination not synced to URL (lost on refresh)
- Multiple independent polling intervals (sidebar 60s + notifications 60s) - no tab-visibility check
- No AbortController on fetches (React memory warnings possible on fast navigation)
- Date formatting uses different strategies across pages (noon adjustment vs raw `new Date()`)
- Reports page uses custom badge styling instead of shared Badge component

### Performance
- Virtual notifications query DB fresh every call (no caching)
- Notification counts capped at 20/10 with no overflow indicator
- No request deduplication between sidebar and notification polling

### Infrastructure
- `.env` file should NOT be in git (rotate credentials if exposed)
- No structured logging for production (only console.error)
- No health check endpoint for monitoring
