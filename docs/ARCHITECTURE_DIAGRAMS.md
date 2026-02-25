# System Architecture Diagrams

This document contains ASCII diagrams for the Oficio Billing System architecture.

## 1. High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Browser   │  │   Mobile    │  │   Desktop   │             │
│  │  (Chrome,   │  │  (Future)   │  │  (Future)   │             │
│  │  Firefox)   │  │             │  │             │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                      │
└─────────┼────────────────┼────────────────┼──────────────────────┘
          │                │                │
          └────────────────┴────────────────┘
                           │
                      HTTPS / TLS
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                    PRESENTATION LAYER                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Next.js 16 Frontend                           │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐ │ │
│  │  │  React 19   │  │  Tailwind    │  │   Recharts       │ │ │
│  │  │  Components │  │    CSS       │  │   (Analytics)    │ │ │
│  │  └─────────────┘  └──────────────┘  └──────────────────┘ │ │
│  │                                                            │ │
│  │  ┌────────────────────────────────────────────────────┐  │ │
│  │  │            Context Providers                       │  │ │
│  │  │  - AuthProvider (NextAuth Session)                │  │ │
│  │  │  - RoleProvider (RBAC Permissions)                │  │ │
│  │  │  - ToastProvider (Notifications)                  │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                    APPLICATION LAYER                              │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Next.js API Routes                            │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │  Auth APIs   │  │  Client APIs │  │  Contract APIs  │ │ │
│  │  │  /api/auth/* │  │  /api/       │  │  /api/          │ │ │
│  │  │              │  │  clients/*   │  │  contracts/*    │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │ Invoice APIs │  │ Payment APIs │  │  Report APIs    │ │ │
│  │  │  /api/       │  │  /api/       │  │  /api/          │ │ │
│  │  │  invoices/*  │  │  payments/*  │  │  reports/*      │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │ Approval     │  │  User APIs   │  │  Audit APIs     │ │ │
│  │  │  APIs        │  │  /api/       │  │  /api/          │ │ │
│  │  │  /api/       │  │  users/*     │  │  audit-logs/*   │ │ │
│  │  │  approvals/* │  │              │  │                 │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Middleware Layer                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │    Session   │  │     RBAC     │  │   Rate Limit    │ │ │
│  │  │  Validation  │  │  (Role Check)│  │  (Future)       │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Core Services (src/lib)                       │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │  PDF         │  │  Email       │  │  File Storage   │ │ │
│  │  │  Generation  │  │  Service     │  │  (R2)           │ │ │
│  │  │  - invoice   │  │  - Resend    │  │  - Upload       │ │ │
│  │  │  - receipt   │  │  - Gmail     │  │  - Download     │ │ │
│  │  │  - contract  │  │  - Routing   │  │  - Delete       │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │  Audit       │  │  Approval    │  │  Excel          │ │ │
│  │  │  Logging     │  │  Workflow    │  │  Import/Export  │ │ │
│  │  │  - Create    │  │  - Request   │  │  - Parse        │ │ │
│  │  │  - Query     │  │  - Execute   │  │  - Generate     │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                    DATA ACCESS LAYER                              │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Prisma ORM                                    │ │
│  │  - Type-safe queries                                       │ │
│  │  - Migration management                                    │ │
│  │  - Connection pooling                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────┬───────────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
┌────────▼─────────────────────┐  ┌──────────▼────────────────────┐
│     DATA STORAGE LAYER       │  │  EXTERNAL SERVICES LAYER      │
│                              │  │                               │
│  ┌────────────────────────┐ │  │  ┌─────────────────────────┐ │
│  │  PostgreSQL Database   │ │  │  │  Cloudflare R2 Storage  │ │
│  │  (Supabase Hosted)     │ │  │  │  - Invoice PDFs         │ │
│  │                        │ │  │  │  - Receipt PDFs         │ │
│  │  ┌──────────────────┐ │ │  │  │  - Contract PDFs        │ │
│  │  │  Tables:         │ │ │  │  │  - Payment Evidence     │ │
│  │  │  - Client        │ │ │  │  └─────────────────────────┘ │
│  │  │  - Contact       │ │ │  │                               │
│  │  │  - Contract      │ │ │  │  ┌─────────────────────────┐ │
│  │  │  - Invoice       │ │ │  │  │  Email Services         │ │
│  │  │  - Payment       │ │ │  │  │  ┌──────────┐           │ │
│  │  │  - User          │ │ │  │  │  │ Resend   │           │ │
│  │  │  - Approval      │ │ │  │  │  │ (Primary)│           │ │
│  │  │  - AuditLog      │ │ │  │  │  └──────────┘           │ │
│  │  │  - EmailLog      │ │ │  │  │  ┌──────────┐           │ │
│  │  │  - AuthLog       │ │ │  │  │  │  Gmail   │           │ │
│  │  │  - Company       │ │ │  │  │  │(Fallback)│           │ │
│  │  └──────────────────┘ │ │  │  │  └──────────┘           │ │
│  │                        │ │  │  └─────────────────────────┘ │
│  └────────────────────────┘ │  │                               │
│                              │  │  ┌─────────────────────────┐ │
└──────────────────────────────┘  │  │  NextAuth.js Sessions   │ │
                                  │  │  - JWT Tokens           │ │
                                  │  │  - Session Management   │ │
                                  │  └─────────────────────────┘ │
                                  │                               │
                                  └───────────────────────────────┘
```

## 2. Data Flow Architecture

### 2.1 User Authentication Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. POST /api/auth/signin
     │    (email, password)
     │
┌────▼──────────────────────────────────────────────────────────────┐
│                     NextAuth.js                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  2. Credentials Provider                                     │ │
│  │     - Validate email format                                  │ │
│  │     - Query User table via Prisma                            │ │
│  └───────────────────────┬──────────────────────────────────────┘ │
└────────────────────────▼─────────────────────────────────────────┘
                         │
                         │ 3. bcryptjs.compare()
                         │    (password, hashedPassword)
                         │
                    ┌────▼────┐
                    │ Valid?  │
                    └────┬────┘
                         │
            ┌────────────┴────────────┐
            │ YES                     │ NO
            │                         │
    ┌───────▼──────┐         ┌────────▼────────┐
    │ 4. Generate  │         │ Return 401      │
    │    JWT Token │         │ "Invalid creds" │
    │    - id      │         └─────────────────┘
    │    - email   │
    │    - name    │
    │    - role    │
    └───────┬──────┘
            │
    ┌───────▼──────────┐
    │ 5. Set Session   │
    │    Cookie        │
    │    (httpOnly,    │
    │     secure)      │
    └───────┬──────────┘
            │
    ┌───────▼──────────┐
    │ 6. Create        │
    │    AuthLog       │
    │    (LOGIN)       │
    └───────┬──────────┘
            │
    ┌───────▼──────────┐
    │ 7. Update User   │
    │    lastLoginAt   │
    └───────┬──────────┘
            │
    ┌───────▼──────────┐
    │ 8. Redirect to   │
    │    /dashboard    │
    └──────────────────┘
```

### 2.2 Invoice Generation Flow

```
┌──────────┐
│  Admin/  │
│ Employee │
└────┬─────┘
     │ 1. Click "Generate Invoices"
     │    Select billing period
     │
┌────▼───────────────────────────────────────────────────────────────┐
│                    POST /api/invoices/generate                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  2. Validate Session & Permissions                           │  │
│  └───────────────────────┬──────────────────────────────────────┘  │
│  ┌───────────────────────▼──────────────────────────────────────┐  │
│  │  3. Query Active Clients                                     │  │
│  │     - WHERE status = 'active'                                │  │
│  │     - Match billing cycle to period                          │  │
│  └───────────────────────┬──────────────────────────────────────┘  │
└────────────────────────┬─▼────────────────────────────────────────┘
                         │
                 ┌───────▼────────┐
                 │  For each      │
                 │  client...     │
                 └───────┬────────┘
                         │
    ┌────────────────────┴────────────────────┐
    │                                         │
┌───▼──────────────────────────┐  ┌──────────▼─────────────────────┐
│  4. Calculate Amounts        │  │  5. Generate Invoice Number    │
│     - Base rental rate       │  │     - Sequential: INV-00001    │
│     - VAT (12% if applicable)│  │     - Check uniqueness         │
│     - Withholding tax (5%)   │  └────────────────────────────────┘
│     - Net amount             │
└───┬──────────────────────────┘
    │
┌───▼──────────────────────────┐
│  6. Generate PDF             │
│     (src/lib/invoice-pdf.ts) │
│     - Company branding       │
│     - Client details         │
│     - Line items             │
│     - Bank details           │
│     - Totals                 │
└───┬──────────────────────────┘
    │
┌───▼──────────────────────────┐
│  7. Upload to R2 Storage     │
│     - Path: invoices/        │
│              INV-{num}.pdf   │
│     - Get public URL         │
└───┬──────────────────────────┘
    │
┌───▼──────────────────────────┐
│  8. Prisma Transaction       │
│     - Create Invoice record  │
│     - Set filePath           │
│     - Set status='pending'   │
└───┬──────────────────────────┘
    │
┌───▼──────────────────────────┐
│  9. Create Audit Log         │
│     - Action: CREATE         │
│     - Category: INVOICE      │
│     - Entity data            │
└───┬──────────────────────────┘
    │
┌───▼──────────────────────────┐
│  10. Return Success          │
│      - Invoice IDs           │
│      - Download links        │
└───┬──────────────────────────┘
    │
┌───▼──────────────────────────┐
│  Frontend                    │
│  - Show success toast        │
│  - Refresh invoice list      │
│  - Enable "Send" button      │
└──────────────────────────────┘
```

### 2.3 Invoice Email Sending Flow

```
┌──────────┐
│  Admin/  │
│ Employee │
└────┬─────┘
     │ 1. Select invoices
     │    Click "Send Invoice"
     │
┌────▼──────────────────────────────────────────────────────────────┐
│                    POST /api/invoices/send                         │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  2. Validate invoiceIds array                               │  │
│  │     - Must be pending or overdue status                     │  │
│  └──────────────────────┬──────────────────────────────────────┘  │
│  ┌──────────────────────▼──────────────────────────────────────┐  │
│  │  3. Check Email Configuration                               │  │
│  │     - isEmailConfigured() checks:                           │  │
│  │       * RESEND_API_KEY or                                   │  │
│  │       * GMAIL_USER + GMAIL_APP_PASSWORD                     │  │
│  └──────────────────────┬──────────────────────────────────────┘  │
│  ┌──────────────────────▼──────────────────────────────────────┐  │
│  │  4. Query Invoices + Client + Primary Contact              │  │
│  │     - Include relationships                                 │  │
│  │     - Get PDF file paths                                    │  │
│  └──────────────────────┬──────────────────────────────────────┘  │
└────────────────────────┬▼──────────────────────────────────────────┘
                         │
                 ┌───────▼────────┐
                 │  For each      │
                 │  invoice...    │
                 └───────┬────────┘
                         │
    ┌────────────────────┴────────────────────┐
    │                                         │
┌───▼──────────────────────────┐  ┌──────────▼─────────────────────┐
│  5. Download PDF from R2     │  │  6. Determine Email Provider   │
│     - Get invoice file       │  │     Based on EMAIL_PROVIDER:   │
│     - Load into buffer       │  │     - 'resend' → Use Resend    │
│     - Validate exists        │  │     - 'gmail' → Use Gmail      │
└───┬──────────────────────────┘  │     - 'auto' → Try Resend,     │
    │                              │                fallback Gmail  │
    │                              └────────────────────────────────┘
    │
┌───▼──────────────────────────────────────────────────────────────┐
│  7. Send Email (src/lib/email.ts)                                │
│     ┌──────────────────────────────────────────────────────────┐│
│     │  sendInvoiceEmail() smart routing:                       ││
│     │  - Try primary provider                                  ││
│     │  - If auto mode & fails → try fallback                   ││
│     │  - Return: { success, messageId, provider }              ││
│     └──────────────────────────────────────────────────────────┘│
│                                                                  │
│  Email Content:                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - To: Primary contact email                               │ │
│  │  - From: Company <invoices@domain.com>                     │ │
│  │  - Subject: Invoice #INV-001 from Company                  │ │
│  │  - HTML Body:                                               │ │
│  │    * Company header                                         │ │
│  │    * Invoice details                                        │ │
│  │    * Payment instructions (BDO, Security Bank)             │ │
│  │    * Professional styling                                   │ │
│  │  - Attachment: Invoice-INV-001.pdf                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└───┬──────────────────────────────────────────────────────────────┘
    │
┌───▼──────────────────────────┐
│  8. Update Invoice Status    │
│     - status = 'sent'         │
│     - sentAt = now()          │
└───┬──────────────────────────┘
    │
┌───▼──────────────────────────┐
│  9. Create EmailLog          │
│     - recipient              │
│     - status                 │
│     - provider used          │
└───┬──────────────────────────┘
    │
┌───▼──────────────────────────┐
│  10. Return Results          │
│      - successCount          │
│      - emailSentCount        │
│      - Per-invoice status    │
└───┬──────────────────────────┘
    │
┌───▼──────────────────────────┐
│  Frontend                    │
│  - Show success toast        │
│  - Update invoice status     │
│  - Show provider used        │
└──────────────────────────────┘
```

### 2.4 Approval Workflow

```
┌──────────┐
│ Employee │
└────┬─────┘
     │ 1. Attempt sensitive action
     │    (e.g., Delete client)
     │
┌────▼──────────────────────────────────────────────────────────────┐
│                   Frontend detects restricted action               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  2. Check user role                                         │  │
│  │     - If EMPLOYEE → Show approval request modal             │  │
│  │     - If ADMIN → Allow direct action                        │  │
│  └──────────────────────┬──────────────────────────────────────┘  │
└────────────────────────┬▼──────────────────────────────────────────┘
                         │
    ┌────────────────────▼────────────────────┐
    │  3. Employee fills request form         │
    │     - Reason for action                 │
    │     - Additional context                │
    └────────────────────┬────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────────┐
│                   POST /api/approvals                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  4. Create ApprovalRequest                                   │  │
│  │     - requestedBy: user.id                                   │  │
│  │     - actionType: 'DELETE_CLIENT'                            │  │
│  │     - entityType: 'client'                                   │  │
│  │     - entityId: client.id                                    │  │
│  │     - reason: user's explanation                             │  │
│  │     - metadata: { clientName, address, ... }                 │  │
│  │     - status: 'PENDING'                                      │  │
│  └──────────────────────┬───────────────────────────────────────┘  │
│  ┌──────────────────────▼───────────────────────────────────────┐  │
│  │  5. Create Audit Log                                         │  │
│  │     - Action: REQUEST_APPROVAL                               │  │
│  │     - Category: APPROVAL                                     │  │
│  └──────────────────────┬───────────────────────────────────────┘  │
└────────────────────────┬▼──────────────────────────────────────────┘
                         │
    ┌────────────────────▼────────────────────┐
    │  6. Employee sees "Request submitted"   │
    │     - Can view in /my-requests          │
    └─────────────────────────────────────────┘

                    *** TIME PASSES ***

┌─────────┐
│  Admin  │
└────┬────┘
     │ 7. Navigates to /approvals
     │    Sees pending request badge
     │
┌────▼──────────────────────────────────────────────────────────────┐
│                   GET /api/approvals?status=PENDING                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  8. Return pending approval requests                         │  │
│  │     - Ordered by createdAt (oldest first)                    │  │
│  │     - Include full metadata                                  │  │
│  └──────────────────────┬───────────────────────────────────────┘  │
└────────────────────────┬▼──────────────────────────────────────────┘
                         │
    ┌────────────────────▼────────────────────┐
    │  9. Admin reviews request               │
    │     - Sees employee name                │
    │     - Sees action details               │
    │     - Sees reason                       │
    │     - Can add review notes              │
    │     - Clicks Approve or Reject          │
    └────────────────────┬────────────────────┘
                         │
            ┌────────────┴────────────┐
            │ APPROVE                 │ REJECT
            │                         │
┌───────────▼──────────────────┐  ┌──▼─────────────────────────────┐
│ POST /api/approvals/[id]/    │  │ POST /api/approvals/[id]/      │
│       approve                │  │       reject                   │
│                              │  │                                │
│  10a. Update Request         │  │  10b. Update Request           │
│       - status = APPROVED    │  │       - status = REJECTED      │
│       - reviewedBy = admin   │  │       - reviewedBy = admin     │
│       - reviewedAt = now()   │  │       - reviewedAt = now()     │
│       - reviewNotes          │  │       - reviewNotes            │
│                              │  │                                │
│  11a. Execute Action         │  │  11b. No action executed       │
│       via executeApproved    │  │                                │
│       Action()               │  │                                │
│       - DELETE client        │  │                                │
│       - CASCADE relations    │  │                                │
│                              │  │                                │
│  12a. Create Audit Logs      │  │  12b. Create Audit Log         │
│       - Approval action      │  │       - Rejection              │
│       - Actual delete        │  │                                │
│       - wasApproved = true   │  │                                │
└───────────┬──────────────────┘  └────────────┬───────────────────┘
            │                                  │
            └────────────┬─────────────────────┘
                         │
    ┌────────────────────▼────────────────────┐
    │  13. Return to admin                    │
    │      - Show success toast               │
    │      - Remove from pending list         │
    │      - Update badge count               │
    └─────────────────────────────────────────┘

    ┌─────────────────────────────────────────┐
    │  14. Employee can view outcome          │
    │      in /my-requests                    │
    │      - Status: APPROVED or REJECTED     │
    │      - Review notes visible             │
    └─────────────────────────────────────────┘
```

## 3. Component Architecture

### 3.1 Frontend Component Hierarchy

```
App (layout.tsx)
│
├─ Providers
│  ├─ AuthProvider (NextAuth SessionProvider)
│  ├─ RoleProvider (RBAC context)
│  └─ ToastProvider (Notification system)
│
├─ Login Page (/login)
│  └─ LoginForm
│
└─ Dashboard Layout (/dashboard/*)
   │
   ├─ Sidebar
   │  ├─ Logo
   │  ├─ Navigation Items (role-filtered)
   │  │  ├─ Dashboard
   │  │  ├─ Clients
   │  │  ├─ Contracts
   │  │  ├─ Invoices
   │  │  ├─ Payments
   │  │  ├─ Reports
   │  │  ├─ Settings
   │  │  ├─ Approvals (Admin only)
   │  │  ├─ My Requests (Employee only)
   │  │  ├─ Users (Admin only)
   │  │  └─ Audit Logs (Admin only)
   │  └─ Logout Button
   │
   ├─ Header
   │  ├─ Page Title
   │  ├─ Breadcrumbs
   │  └─ User Menu
   │     ├─ Profile
   │     └─ Settings
   │
   └─ Main Content Area
      │
      ├─ Dashboard Page
      │  ├─ Stats Cards
      │  ├─ Charts (Revenue, Invoices)
      │  └─ Activity Feed
      │
      ├─ Clients Module
      │  ├─ Clients List Page
      │  │  ├─ SearchBar
      │  │  ├─ FilterDropdowns
      │  │  ├─ BulkActions
      │  │  │  ├─ Import Button
      │  │  │  ├─ Export Button
      │  │  │  └─ Status Update
      │  │  ├─ ClientTable
      │  │  │  └─ ClientRow (repeated)
      │  │  └─ Pagination
      │  │
      │  ├─ New Client Page
      │  │  └─ ClientForm
      │  │     ├─ BasicInfo
      │  │     ├─ LeaseTerms
      │  │     └─ ContactsList
      │  │
      │  ├─ Client Detail Page
      │  │  ├─ ClientInfo
      │  │  ├─ ContactsCard
      │  │  ├─ ContractsCard
      │  │  ├─ InvoicesCard
      │  │  └─ PaymentsCard
      │  │
      │  └─ Edit Client Page
      │     └─ ClientForm (pre-filled)
      │
      ├─ Contracts Module
      │  ├─ Contracts List Page
      │  │  ├─ FilterBar
      │  │  ├─ ContractTable
      │  │  └─ Pagination
      │  │
      │  ├─ Generate Contract Page
      │  │  └─ ContractForm
      │  │     ├─ ClientSelector
      │  │     ├─ DatePicker
      │  │     └─ SignerInfo
      │  │
      │  ├─ Batch Generate Page
      │  │  └─ BatchContractForm
      │  │     └─ ClientMultiSelect
      │  │
      │  └─ Contract Detail Page
      │     ├─ ContractInfo
      │     ├─ PDFViewer
      │     ├─ ActionButtons
      │     │  ├─ Download
      │     │  ├─ Regenerate
      │     │  └─ ChangeStatus
      │     └─ HistoryTimeline
      │
      ├─ Invoices Module
      │  ├─ Invoices List Page
      │  │  ├─ StatusTabs
      │  │  ├─ DateRangePicker
      │  │  ├─ SearchBar
      │  │  ├─ InvoiceTable
      │  │  │  └─ InvoiceRow (with status badge)
      │  │  ├─ BulkActions
      │  │  │  ├─ Generate Button
      │  │  │  └─ Send Email Button
      │  │  └─ Pagination
      │  │
      │  ├─ Generate Invoices Page
      │  │  └─ InvoiceGenerationForm
      │  │     ├─ BillingPeriodPicker
      │  │     ├─ ClientSelector (optional)
      │  │     └─ PreviewTable
      │  │
      │  ├─ New Invoice Page (Manual)
      │  │  └─ InvoiceForm
      │  │     ├─ ClientSelector
      │  │     ├─ AmountInputs
      │  │     ├─ DatePickers
      │  │     └─ TaxToggles
      │  │
      │  └─ Invoice Detail Page
      │     ├─ InvoiceInfo
      │     ├─ AmountBreakdown
      │     ├─ PDFPreview
      │     ├─ ActionButtons
      │     │  ├─ Download
      │     │  ├─ Send Email
      │     │  ├─ Regenerate
      │     │  └─ Record Payment
      │     ├─ PaymentsTable
      │     └─ ActivityLog
      │
      ├─ Payments Module
      │  ├─ Payments List Page
      │  │  ├─ DateRangePicker
      │  │  ├─ SearchBar
      │  │  ├─ PaymentTable
      │  │  └─ TotalsSummary
      │  │
      │  ├─ New Payment Page
      │  │  └─ PaymentForm
      │  │     ├─ InvoiceSelector
      │  │     ├─ AmountInput
      │  │     ├─ DatePicker
      │  │     ├─ MethodSelector
      │  │     ├─ EvidenceUpload
      │  │     └─ RemarksTextArea
      │  │
      │  └─ Payment Detail Page
      │     ├─ PaymentInfo
      │     ├─ InvoiceInfo
      │     ├─ EvidencePreview
      │     ├─ ReceiptDownload
      │     └─ ActionButtons
      │
      ├─ Reports Module
      │  └─ Reports Page (Tabbed)
      │     ├─ Contract Status Tab
      │     │  ├─ StatusCards
      │     │  └─ ContractsTable
      │     │
      │     ├─ Renewals Tab
      │     │  ├─ UrgencyCards
      │     │  └─ RenewalsTable (grouped)
      │     │
      │     ├─ Billing Summary Tab
      │     │  ├─ SummaryCards
      │     │  ├─ StatusPieChart
      │     │  ├─ OverdueTable
      │     │  └─ ClientBillingTable
      │     │
      │     └─ Revenue Tab (Admin only)
      │        ├─ RevenueCards
      │        ├─ MonthlyLineChart
      │        ├─ TopClientsBarChart
      │        ├─ PaymentMethodsBreakdown
      │        └─ RecentPaymentsTable
      │
      ├─ Approvals Module (Admin)
      │  └─ Approvals Page
      │     ├─ PendingBadge
      │     ├─ StatusTabs
      │     ├─ ApprovalCard (repeated)
      │     │  ├─ RequestInfo
      │     │  ├─ RequesterInfo
      │     │  ├─ EntityDetails
      │     │  ├─ ReasonDisplay
      │     │  ├─ ReviewNotesInput
      │     │  └─ ApproveRejectButtons
      │     └─ Pagination
      │
      ├─ My Requests Module (Employee)
      │  └─ My Requests Page
      │     ├─ StatusTabs
      │     ├─ RequestCard (repeated)
      │     │  ├─ RequestInfo
      │     │  ├─ StatusBadge
      │     │  ├─ ReviewInfo (if reviewed)
      │     │  └─ ReviewNotes (if any)
      │     └─ Pagination
      │
      ├─ Users Module (Admin)
      │  └─ Users Page
      │     ├─ CreateUserButton
      │     ├─ UserTable
      │     │  └─ UserRow
      │     │     ├─ UserInfo
      │     │     ├─ RoleBadge
      │     │     ├─ StatusBadge
      │     │     └─ ActionButtons
      │     │        ├─ EditRole
      │     │        └─ ToggleActive
      │     ├─ CreateUserModal
      │     │  └─ UserForm
      │     └─ EditUserModal
      │        └─ UserForm (pre-filled)
      │
      ├─ Audit Logs Module (Admin)
      │  └─ Audit Logs Page
      │     ├─ FilterBar
      │     │  ├─ ActionFilter
      │     │  ├─ CategoryFilter
      │     │  ├─ UserFilter
      │     │  └─ DateRangePicker
      │     ├─ AuditLogTable
      │     │  └─ AuditLogRow
      │     │     ├─ Timestamp
      │     │     ├─ UserInfo
      │     │     ├─ ActionBadge
      │     │     ├─ EntityInfo
      │     │     ├─ ChangesSummary
      │     │     └─ ExpandDetails
      │     └─ Pagination
      │
      └─ Settings Module
         └─ Settings Page (Tabbed)
            ├─ Profile Tab
            │  ├─ ProfileInfo
            │  ├─ UserProfileModal
            │  └─ ChangePasswordForm
            │
            └─ Company Tab (Admin only)
               └─ CompanySettingsForm
                  ├─ BasicInfo
                  ├─ ContactInfo
                  ├─ BankDetails
                  └─ SignersList
```

## 4. Database Schema Diagram

See detailed schema in [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 3.1

---

## 5. Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Transport Security                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - HTTPS/TLS encryption                                    │ │
│  │  - Secure cookies (httpOnly, secure, sameSite)             │ │
│  │  - CORS policy                                             │ │
│  │  - CSRF protection (NextAuth built-in)                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Authentication                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  NextAuth.js                                               │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  - Credentials provider                              │ │ │
│  │  │  - JWT tokens                                        │ │ │
│  │  │  - Session management                                │ │ │
│  │  │  - Password hashing (bcryptjs, 10 rounds)            │ │ │
│  │  │  - Session expiry (30 days)                          │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Authorization (RBAC)                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Role-Based Access Control                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  Roles:                                              │ │ │
│  │  │  - ADMIN: Full access                                │ │ │
│  │  │  - EMPLOYEE: Limited access                          │ │ │
│  │  │                                                       │ │ │
│  │  │  Enforcement:                                         │ │ │
│  │  │  - Frontend: RoleContext + conditional rendering    │ │ │
│  │  │  - Backend: Middleware (requireAdmin, requireAuth)  │ │ │
│  │  │  - API Routes: Session validation on every request  │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Input Validation                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - TypeScript type checking                                │ │
│  │  - Server-side validation                                  │ │
│  │  - Prisma schema validation                                │ │
│  │  - Input sanitization                                      │ │
│  │  - SQL injection prevention (Prisma ORM)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 5: Approval Workflows                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - Sensitive operations require admin approval            │ │
│  │  - Employee actions tracked and reviewed                  │ │
│  │  - Automated execution after approval                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 6: Audit Logging                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - All CRUD operations logged                              │ │
│  │  - User attribution                                        │ │
│  │  - Before/after data capture                               │ │
│  │  - IP address and user agent tracking                      │ │
│  │  - Immutable log records                                   │ │
│  │  - Admin-only access to logs                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 7: Data Protection                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  - Environment variables for secrets                       │ │
│  │  - No credentials in code                                  │ │
│  │  - Cloudflare R2 access control                            │ │
│  │  - Pre-signed URLs for file access                         │ │
│  │  - Database encryption at rest (Supabase)                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

**Document Version**: 1.0
**Last Updated**: February 25, 2025
**Related Documents**:
- [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - Detailed system design
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference (to be created)
