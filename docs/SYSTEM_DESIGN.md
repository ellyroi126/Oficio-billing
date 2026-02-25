# Oficio Billing System - High-Level System Design

## Executive Summary

Oficio Billing is a comprehensive property lease management and billing system built with modern web technologies. It manages the complete lifecycle of property leasing operations including client management, contract generation, invoice processing, payment tracking, and financial reporting.

**Tech Stack**: Next.js 16, React 19, TypeScript, PostgreSQL, Prisma ORM, NextAuth.js, Cloudflare R2, Tailwind CSS

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Data Model](#3-data-model)
4. [Core Modules](#4-core-modules)
5. [Security & Access Control](#5-security--access-control)
6. [External Integrations](#6-external-integrations)
7. [Infrastructure](#7-infrastructure)
8. [Scalability Considerations](#8-scalability-considerations)
9. [Future Enhancements](#9-future-enhancements)

---

## 1. System Overview

### 1.1 Purpose
The Oficio Billing System digitizes and automates property lease management operations for Oficio Property Leasing, replacing manual processes with an integrated web application.

### 1.2 Key Capabilities

**Client Management**
- Client onboarding with contact information
- Lease term tracking (rental rates, VAT, billing terms)
- Multi-contact support per client
- Client status management (active/inactive)
- Bulk operations (import, export, status updates)

**Contract Management**
- Automated contract generation from templates
- Digital contract storage and retrieval
- Contract lifecycle tracking (draft → active → expired)
- Batch contract generation
- Renewal reminders

**Invoice Management**
- Automated invoice generation based on billing cycles
- VAT and withholding tax calculations
- Invoice status workflow (pending → sent → paid)
- PDF invoice generation and storage
- Email delivery with payment instructions

**Payment Processing**
- Payment recording against invoices
- Multiple payment methods support
- Payment evidence upload
- Automated receipt generation
- Payment tracking and reconciliation

**Reporting & Analytics**
- Contract status reports
- Upcoming renewal alerts
- Billing summaries
- Revenue reports with trends
- Overdue invoice tracking

**User Management & RBAC**
- Role-based access control (Admin, Employee)
- User lifecycle management
- Approval workflows for sensitive operations
- Comprehensive audit logging

### 1.3 Users

**Primary Users**
- **Administrators**: Full system access, user management, approvals
- **Employees**: Limited access to operational features

**External Users** (Indirect)
- **Clients**: Receive emails, invoices, contracts (no login)

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                           │
│  (React 19, Next.js 16 Frontend, Tailwind CSS)             │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  Next.js Application Server                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              App Router (src/app)                     │  │
│  │  - Pages (SSR/CSR)                                   │  │
│  │  - API Routes (/api/*)                               │  │
│  │  - Middleware (Authentication, RBAC)                 │  │
│  └─────────┬──────────────────────┬─────────────────────┘  │
│            │                      │                          │
│  ┌─────────▼──────────┐  ┌───────▼──────────┐              │
│  │  Business Logic    │  │   Context Layer   │              │
│  │  (src/lib)        │  │  - RoleContext    │              │
│  │  - PDF Generation  │  │  - ToastContext   │              │
│  │  - Email Service   │  │  - AuthProvider   │              │
│  │  - File Storage    │  └───────────────────┘              │
│  │  - Audit Logging   │                                      │
│  │  - Approvals       │                                      │
│  └─────────┬──────────┘                                      │
└────────────┼─────────────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────┬────────────────┐
    │                 │              │                │
┌───▼───┐      ┌─────▼─────┐  ┌────▼─────┐   ┌─────▼──────┐
│ PostgreSQL   │ Cloudflare │  │  Email   │   │  NextAuth  │
│  (Supabase)  │  R2 Storage│  │ Services │   │  Sessions  │
│              │            │  │  (Resend/│   │            │
│ - Client     │ - Invoices │  │  Gmail)  │   │ - User     │
│ - Contract   │ - Receipts │  │          │   │   Sessions │
│ - Invoice    │ - Evidence │  │          │   │ - JWT      │
│ - Payment    │ - Contracts│  │          │   │   Tokens   │
│ - User       │            │  │          │   │            │
│ - AuditLog   │            │  │          │   │            │
│ - Approvals  │            │  │          │   │            │
└──────────────┘ └────────────┘ └──────────┘   └────────────┘
```

### 2.2 Technology Stack

**Frontend**
- **Framework**: Next.js 16 (React 19) with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components in src/components/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **State Management**: React Context API (Auth, Role, Toast)

**Backend**
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **Authentication**: NextAuth.js v4

**File Storage**
- **Primary**: Cloudflare R2 (S3-compatible)
- **SDK**: AWS SDK v3 (@aws-sdk/client-s3)
- **Files Stored**: PDFs (invoices, contracts, receipts), payment evidence

**Email Services**
- **Primary**: Resend API (for production)
- **Fallback**: Gmail SMTP via Nodemailer
- **Smart Routing**: Auto-fallback on failures

**Document Generation**
- **PDF**: pdf-lib (invoice, receipt, contract generation)
- **Word**: docx (contract templates)
- **Excel**: xlsx (bulk operations, reports)

**Security**
- **Password Hashing**: bcryptjs
- **Session Management**: NextAuth.js with JWT
- **Role-Based Access Control**: Custom middleware
- **Audit Logging**: Comprehensive tracking of all actions

### 2.3 Application Structure

```
oficio-billing/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # Authenticated routes
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── clients/              # Client management
│   │   │   ├── contracts/            # Contract management
│   │   │   ├── invoices/             # Invoice management
│   │   │   ├── payments/             # Payment tracking
│   │   │   ├── reports/              # Reports & analytics
│   │   │   ├── approvals/            # Approval workflows (Admin)
│   │   │   ├── my-requests/          # My approval requests (Employee)
│   │   │   ├── users/                # User management (Admin)
│   │   │   ├── audit-logs/           # Audit logs (Admin)
│   │   │   └── settings/             # Settings
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/                 # NextAuth endpoints
│   │   │   ├── clients/              # Client CRUD
│   │   │   ├── contracts/            # Contract CRUD
│   │   │   ├── invoices/             # Invoice CRUD
│   │   │   ├── payments/             # Payment CRUD
│   │   │   ├── reports/              # Report generation
│   │   │   ├── approvals/            # Approval workflows
│   │   │   ├── users/                # User management
│   │   │   ├── audit-logs/           # Audit log queries
│   │   │   ├── dashboard/            # Dashboard stats
│   │   │   └── company/              # Company settings
│   │   ├── login/                    # Login page
│   │   └── layout.tsx                # Root layout
│   ├── components/                   # React components
│   │   ├── ui/                       # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── Skeleton.tsx
│   │   ├── layout/                   # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── charts/                   # Chart components
│   │   ├── clients/                  # Client-specific components
│   │   ├── contracts/                # Contract-specific components
│   │   ├── invoices/                 # Invoice-specific components
│   │   ├── payments/                 # Payment-specific components
│   │   └── approvals/                # Approval-specific components
│   ├── contexts/                     # React Context providers
│   │   ├── RoleContext.tsx           # Role-based access
│   │   └── ToastContext.tsx          # Toast notifications
│   ├── lib/                          # Business logic & utilities
│   │   ├── prisma.ts                 # Prisma client
│   │   ├── email.ts                  # Email service (Resend)
│   │   ├── email-gmail.ts            # Gmail SMTP service
│   │   ├── invoice-pdf.ts            # Invoice PDF generation
│   │   ├── receipt-pdf.ts            # Receipt PDF generation
│   │   ├── contract-pdf.ts           # Contract PDF generation
│   │   ├── r2-storage.ts             # Cloudflare R2 operations
│   │   ├── auditLog.ts               # Audit logging utility
│   │   ├── approvalRequest.ts        # Approval workflow logic
│   │   ├── executeApprovedAction.ts  # Execute approved actions
│   │   ├── excel-export.ts           # Excel export utilities
│   │   └── middleware/
│   │       └── roleCheck.ts          # RBAC middleware
│   └── types/                        # TypeScript type definitions
│       ├── index.ts                  # Common types
│       └── next-auth.d.ts            # NextAuth type extensions
├── prisma/
│   └── schema.prisma                 # Database schema
├── docs/                             # Documentation
│   ├── EMAIL_QUICKSTART.md
│   ├── EMAIL_SETUP_GMAIL.md
│   └── EMAIL_SETUP_RESEND.md
├── .env                              # Environment variables
├── .env.example                      # Environment template
└── package.json                      # Dependencies
```

### 2.4 Request Flow

**Authenticated Page Request**
```
1. User → Browser requests /clients
2. Next.js middleware checks session
3. If not authenticated → Redirect to /login
4. If authenticated → Render page (SSR)
5. Page fetches data via API routes
6. API route validates session + role
7. API route queries Prisma → PostgreSQL
8. Data returned to page
9. Page renders with data
```

**API Request (e.g., Create Invoice)**
```
1. Frontend → POST /api/invoices
2. API route validates session
3. API route checks RBAC permissions
4. Validates request body
5. Creates audit log entry (before)
6. Prisma transaction:
   - Create invoice record
   - Generate PDF via pdf-lib
   - Upload PDF to Cloudflare R2
   - Update invoice with file path
7. Creates audit log entry (after)
8. Returns success response
9. Frontend updates UI + shows toast
```

---

## 3. Data Model

### 3.1 Entity Relationship Diagram

```
┌─────────────┐
│   Company   │
│  (Settings) │
└─────────────┘

┌─────────────┐       ┌──────────────┐       ┌────────────┐
│    User     │       │    Client    │───────│  Contact   │
│             │       │              │  1:N  │            │
│ - email     │       │ - clientName │       │ - email    │
│ - password  │       │ - address    │       │ - mobile   │
│ - role      │       │ - rentalRate │       │ - isPrimary│
│ - isActive  │       │ - startDate  │       └────────────┘
└─────────────┘       │ - endDate    │
                      │ - status     │
                      └──────┬───────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
        ┌────▼─────┐   ┌────▼──────┐   ┌───▼────────┐
        │ Contract │   │  Invoice  │   │  Payment   │
        │          │   │           │   │            │
        │ - number │   │ - number  │◄──┤ - amount   │
        │ - status │   │ - amount  │1:N│ - method   │
        │ - filePath│   │ - status  │   │ - date     │
        │ - dates  │   │ - dates   │   │ - evidence │
        └──────────┘   └───────────┘   └────────────┘

┌─────────────────┐         ┌──────────────────┐
│ ApprovalRequest │         │    AuditLog      │
│                 │         │                  │
│ - requestedBy   │         │ - userId         │
│ - actionType    │         │ - action         │
│ - entityType    │         │ - entityType     │
│ - status        │         │ - beforeData     │
│ - reviewedBy    │         │ - afterData      │
└─────────────────┘         │ - changesSummary │
                            └──────────────────┘

┌─────────────────┐
│    EmailLog     │
│                 │
│ - recipient     │
│ - subject       │
│ - type          │
│ - status        │
└─────────────────┘
```

### 3.2 Core Entities

**Company** (Singleton)
- System-wide company settings
- Contact information
- Bank details
- Authorized signers

**Client**
- Property lease clients
- Rental agreements
- Billing configuration
- Relationships: Contacts (1:N), Contracts (1:N), Invoices (1:N), Payments (1:N)

**ClientContact**
- Multiple contacts per client
- Primary contact designation for communications

**Contract**
- Generated legal agreements
- Status lifecycle: draft → active → expired → terminated
- Stored in Cloudflare R2
- Renewal reminder tracking

**Invoice**
- Automated billing generation
- VAT and withholding tax calculations
- Status: pending → sent → paid → overdue
- PDF storage in R2
- Email delivery tracking

**Payment**
- Payment records against invoices
- Evidence file upload
- Automated receipt generation
- Multiple payment methods

**User**
- System users (admins, employees)
- Role-based permissions
- Password hashing with bcryptjs
- Activity tracking

**ApprovalRequest**
- Workflow for sensitive operations
- Employee requests approval
- Admin reviews and approves/rejects
- Metadata storage for request context

**AuditLog**
- Comprehensive activity tracking
- Before/after data capture
- User attribution
- IP and user agent logging
- Searchable by action, user, entity

**AuthLog**
- Authentication event tracking
- Login/logout recording
- Failed attempt monitoring

**EmailLog**
- Email delivery tracking
- Success/failure status
- Error message capture

### 3.3 Database Indexes

Strategic indexes for query optimization:

```sql
-- User lookups
Users: email, role, isActive

-- Client searches
Clients: clientId

-- Invoice queries
Invoices: clientId, status, dueDate

-- Payment tracking
Payments: clientId, invoiceId, paymentDate

-- Audit log searches
AuditLogs: userId, action, actionCategory, createdAt, (entityType, entityId)

-- Approval workflows
ApprovalRequests: requestedBy, status, actionType, createdAt

-- Auth monitoring
AuthLogs: userId, email, action, createdAt
```

---

## 4. Core Modules

### 4.1 Client Management Module

**Features**
- CRUD operations for clients
- Contact management (multiple per client)
- Bulk import via Excel
- Bulk status updates
- Excel export
- Client lifecycle tracking

**Key APIs**
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create client
- `GET /api/clients/[id]` - Get client details
- `PATCH /api/clients/[id]` - Update client
- `DELETE /api/clients/[id]` - Delete client
- `POST /api/clients/upload` - Bulk import
- `GET /api/clients/template` - Download Excel template

**Pages**
- `/clients` - Client list with search/filter
- `/clients/new` - Create new client
- `/clients/[id]` - Client detail view
- `/clients/[id]/edit` - Edit client

### 4.2 Contract Management Module

**Features**
- Automated contract generation from Word templates
- PDF conversion and storage
- Batch contract generation
- Contract status workflow
- Renewal reminders
- Digital signature tracking

**Key APIs**
- `GET /api/contracts` - List contracts
- `POST /api/contracts` - Generate contract
- `POST /api/contracts/batch` - Batch generation
- `GET /api/contracts/[id]` - Get contract
- `PATCH /api/contracts/[id]` - Update contract
- `GET /api/contracts/[id]/download` - Download PDF

**Pages**
- `/contracts` - Contract list
- `/contracts/new` - Generate single contract
- `/contracts/batch` - Batch generation
- `/contracts/[id]` - Contract details

**Business Logic** (src/lib/contract-pdf.ts)
- Template parsing with client data
- Variable substitution
- PDF generation with pdf-lib
- R2 storage upload

### 4.3 Invoice Management Module

**Features**
- Automated invoice generation based on billing cycles
- VAT calculation (12%)
- Withholding tax handling (5%)
- Invoice status workflow
- Email delivery with PDF attachment
- Batch operations

**Key APIs**
- `GET /api/invoices` - List invoices
- `POST /api/invoices/generate` - Generate invoices
- `POST /api/invoices` - Create manual invoice
- `GET /api/invoices/[id]` - Get invoice
- `PATCH /api/invoices/[id]` - Update invoice
- `POST /api/invoices/send` - Send via email
- `POST /api/invoices/regenerate` - Regenerate PDF
- `GET /api/invoices/[id]/download` - Download PDF

**Pages**
- `/invoices` - Invoice list with filters
- `/invoices/new` - Manual invoice creation
- `/invoices/[id]` - Invoice details

**Invoice Generation Logic**
```typescript
1. Fetch active clients with billing cycle
2. Calculate billing period based on terms
3. Calculate amounts:
   - Base rental amount
   - VAT (if applicable): amount * 0.12
   - Withholding tax (if applicable): amount * 0.05
   - Net amount = total - withholding tax
4. Generate sequential invoice number
5. Create PDF with company branding
6. Upload to R2 storage
7. Create database record
8. Create audit log
```

**Email Delivery** (src/lib/email.ts)
- Professional HTML email template
- PDF attachment
- Payment instructions (bank details)
- Smart provider routing (Resend → Gmail fallback)

### 4.4 Payment Management Module

**Features**
- Payment recording against invoices
- Multiple payment methods
- Evidence file upload
- Automated receipt generation
- Payment reconciliation
- Balance tracking

**Key APIs**
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment
- `GET /api/payments/[id]` - Get payment
- `PATCH /api/payments/[id]` - Update payment
- `GET /api/payments/[id]/receipt` - Download receipt
- `POST /api/payments/upload` - Upload evidence

**Pages**
- `/payments` - Payment list
- `/payments/new` - Record payment
- `/payments/[id]` - Payment details

**Payment Processing Flow**
```typescript
1. Select invoice to pay
2. Enter payment details
3. Upload evidence (optional)
4. System:
   - Creates payment record
   - Updates invoice balance
   - If fully paid: marks invoice as 'paid'
   - Generates receipt PDF
   - Uploads receipt to R2
   - Creates audit log
5. Display success message
```

### 4.5 Reporting Module

**Features**
- Contract status reports
- Upcoming renewals (30/60/90 days)
- Billing summary by status
- Revenue reports with trends
- Overdue invoice tracking
- Top clients by revenue
- Payment method breakdown

**Key APIs**
- `GET /api/reports/contracts` - Contract status
- `GET /api/reports/renewals` - Upcoming renewals
- `GET /api/reports/billing` - Billing summary
- `GET /api/reports/revenue` - Revenue analysis

**Pages**
- `/reports` - Unified report dashboard with tabs

**Role-Based Access**
- Employees: Can view reports but financial totals hidden
- Admins: Full access to all metrics

**Reports Include**
- Summary cards with key metrics
- Interactive charts (line, bar, pie)
- Detailed data tables
- Export capabilities

### 4.6 User Management Module (Admin Only)

**Features**
- User creation with role assignment
- User activation/deactivation
- Password management
- Role changes (Admin ↔ Employee)
- Activity monitoring

**Key APIs**
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/[id]` - Update user
- `GET /api/user/profile` - Current user profile
- `POST /api/user/change-password` - Change password

**Pages**
- `/users` - User management (Admin only)
- `/settings` - Profile settings (All users)

**Security**
- Passwords hashed with bcryptjs (10 rounds)
- Role validation on all operations
- Audit logging of all changes

### 4.7 Approval Workflow Module

**Features**
- Request approval for sensitive operations
- Admin review and approval/rejection
- Automatic execution of approved actions
- Request history tracking

**Key APIs**
- `GET /api/approvals` - List approval requests
- `POST /api/approvals` - Create request
- `POST /api/approvals/[id]/approve` - Approve request
- `POST /api/approvals/[id]/reject` - Reject request
- `GET /api/approvals/count` - Pending count (badge)

**Pages**
- `/approvals` - Approval queue (Admin)
- `/my-requests` - My requests (Employee)

**Workflow**
```
1. Employee initiates sensitive action
2. System creates ApprovalRequest
3. Admin receives notification (badge count)
4. Admin reviews request details
5. Admin approves or rejects with notes
6. If approved:
   - System executes action via executeApprovedAction()
   - Creates audit log with approval context
7. Employee notified of decision
```

**Approval Types**
- Client deletion
- Bulk status updates
- User role changes
- Invoice cancellations
- Payment modifications

### 4.8 Audit Logging Module

**Features**
- Comprehensive activity tracking
- Before/after data capture
- User attribution with IP/user agent
- Searchable logs by multiple criteria
- Approval workflow tracking

**Key APIs**
- `GET /api/audit-logs` - Query audit logs
- Filters: action, actionCategory, userId, dateRange

**Pages**
- `/audit-logs` - Audit log viewer (Admin only)

**Log Categories**
- AUTH: Login, logout, password changes
- USER_MGMT: User CRUD operations
- CLIENT: Client management
- CONTRACT: Contract operations
- INVOICE: Invoice operations
- PAYMENT: Payment operations
- APPROVAL: Approval workflow actions

**Captured Data**
```typescript
{
  userId: string
  userName: string
  userEmail: string
  userRole: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | ...
  actionCategory: 'AUTH' | 'CLIENT' | 'INVOICE' | ...
  entityType?: string
  entityId?: string
  entityName?: string
  beforeData?: object
  afterData?: object
  changesSummary?: string
  ipAddress?: string
  userAgent?: string
  createdAt: DateTime
}
```

### 4.9 Dashboard Module

**Features**
- Overview statistics
- Recent activity feed
- Key metrics at a glance
- Quick actions

**Key APIs**
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/activity` - Recent activity

**Pages**
- `/` - Dashboard home

**Metrics Displayed**
- Total clients (active/inactive)
- Active contracts
- Pending invoices
- Outstanding revenue
- Recent payments
- Upcoming renewals

---

## 5. Security & Access Control

### 5.1 Authentication

**Provider**: NextAuth.js v4

**Flow**
```
1. User submits credentials → /api/auth/signin
2. Credentials provider validates against User table
3. Password verified with bcryptjs
4. JWT token generated with user data
5. Session cookie set (httpOnly, secure)
6. User redirected to dashboard
```

**Session Management**
- JWT-based sessions
- 30-day session expiry
- Secure, httpOnly cookies
- CSRF protection

**Password Security**
- bcryptjs hashing (10 rounds)
- Minimum password requirements enforced
- Password change tracking in audit logs

### 5.2 Role-Based Access Control (RBAC)

**Roles**
- **ADMIN**: Full system access
- **EMPLOYEE**: Limited operational access

**Permission Matrix**

| Feature | Admin | Employee |
|---------|-------|----------|
| Dashboard | ✅ | ✅ |
| Clients (View) | ✅ | ✅ |
| Clients (Create/Edit) | ✅ | ✅ |
| Clients (Delete) | ✅ | ⚠️ Approval Required |
| Contracts | ✅ | ✅ |
| Invoices | ✅ | ✅ |
| Payments | ✅ | ✅ |
| Reports | ✅ | ✅ (Limited) |
| Reports (Revenue) | ✅ | ❌ |
| Reports (Financial Totals) | ✅ | ❌ (Hidden) |
| Approvals | ✅ | ❌ |
| My Requests | ❌ | ✅ |
| Users | ✅ | ❌ |
| Audit Logs | ✅ | ❌ |
| Settings | ✅ | ✅ (Profile only) |

**Enforcement**

*Frontend* (src/contexts/RoleContext.tsx)
```typescript
const { isAdmin, isEmployee } = useRole()

// Conditional rendering
{isAdmin && <AdminOnlyButton />}

// Conditional navigation
if (!isAdmin) router.push('/dashboard')
```

*Backend* (src/lib/middleware/roleCheck.ts)
```typescript
// API route protection
const auth = await requireAdmin()
if (auth.error || !auth.user) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

*Page Level*
```typescript
// Redirect if not authorized
useEffect(() => {
  if (session?.user?.role !== 'ADMIN') {
    router.push('/dashboard')
  }
}, [session])
```

### 5.3 Data Security

**Sensitive Data Protection**
- Passwords hashed, never stored plaintext
- JWT secrets in environment variables
- Database credentials in environment variables
- API keys (Resend, R2) in environment variables

**File Security**
- Files stored in Cloudflare R2 with access control
- Pre-signed URLs for temporary access
- No direct public access to sensitive documents

**Input Validation**
- Server-side validation on all API routes
- TypeScript type checking
- Prisma schema validation
- Sanitization of user inputs

**SQL Injection Prevention**
- Prisma ORM with parameterized queries
- No raw SQL execution
- Input validation and sanitization

### 5.4 Audit Trail

**Comprehensive Logging**
- All CRUD operations logged
- User attribution for all actions
- IP address and user agent capture
- Before/after data for updates
- Approval workflow tracking

**Retention**
- Indefinite log retention
- Searchable by multiple criteria
- Admin-only access to logs

**Compliance**
- Activity tracking for regulatory compliance
- User accountability
- Change history preservation

---

## 6. External Integrations

### 6.1 Cloudflare R2 Storage

**Purpose**: File storage for PDFs and uploads

**Integration**: AWS SDK v3 (@aws-sdk/client-s3)

**Implementation** (src/lib/r2-storage.ts)
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
})
```

**Files Stored**
- Invoice PDFs: `invoices/INV-{number}.pdf`
- Receipt PDFs: `receipts/REC-{number}.pdf`
- Contract PDFs: `contracts/CON-{number}.pdf`
- Payment Evidence: `payment-evidence/{id}-{filename}`

**Operations**
- Upload: PutObjectCommand
- Download: GetObjectCommand
- Delete: DeleteObjectCommand
- Public access via R2_PUBLIC_URL

**Benefits**
- S3-compatible API
- Low cost ($0.015/GB/month)
- No egress fees
- High availability
- Fast CDN delivery

### 6.2 Email Services

**Dual Provider Support**

**Resend** (Primary - Production)
- Modern transactional email API
- Domain verification for professional emails
- Better deliverability
- Email analytics dashboard
- Free tier: 100 emails/day

**Gmail SMTP** (Fallback - Development)
- Quick setup with existing Gmail account
- No domain verification needed
- Free tier: 500 emails/day
- Good for testing and low volume

**Smart Routing** (src/lib/email.ts)
```typescript
EMAIL_PROVIDER = 'auto' // Try Resend, fallback to Gmail
EMAIL_PROVIDER = 'resend' // Always use Resend
EMAIL_PROVIDER = 'gmail' // Always use Gmail
```

**Email Types**
- Invoice delivery with PDF attachment
- Payment instructions
- Professional HTML templates
- Company branding

**Future Email Features**
- Payment receipt confirmation
- Contract renewal reminders
- Overdue invoice notifications
- User account emails
- Approval notifications

### 6.3 Supabase PostgreSQL

**Purpose**: Primary database hosting

**Features Used**
- PostgreSQL 15 database
- Connection pooling (PgBouncer)
- Direct connection support
- Dashboard for monitoring
- Automated backups

**Configuration**
```env
DATABASE_URL="postgresql://..." # Pooled connection
DIRECT_URL="postgresql://..." # Direct connection for migrations
```

**Connection Management**
- Prisma ORM for all queries
- Connection pooling for performance
- Automatic reconnection handling

---

## 7. Infrastructure

### 7.1 Deployment Architecture

**Recommended Deployment**: Vercel

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                   │
│  (CDN, SSL, DDoS Protection, Automatic Scaling)        │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │  Vercel Functions   │
          │  (Serverless)       │
          │  - API Routes       │
          │  - SSR Pages        │
          └──────────┬──────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
┌─────▼─────┐  ┌────▼─────┐  ┌────▼──────┐
│ Supabase  │  │Cloudflare│  │  Resend   │
│PostgreSQL │  │    R2    │  │  /Gmail   │
└───────────┘  └──────────┘  └───────────┘
```

**Benefits**
- Zero-configuration deployment
- Automatic HTTPS
- Global CDN
- Automatic scaling
- Preview deployments
- Environment variable management
- Built-in analytics

**Alternative**: Self-hosted with Docker

### 7.2 Environment Variables

**Required Variables**

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with-openssl"

# Cloudflare R2
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="oficio-billing-files"
R2_PUBLIC_URL="https://..."

# Email (Choose provider)
EMAIL_PROVIDER="auto" # or "gmail" or "resend"

# Gmail SMTP (Optional)
GMAIL_USER="info@oficiopl.com"
GMAIL_APP_PASSWORD="..."

# Resend (Optional)
RESEND_API_KEY="re_..."
RESEND_DOMAIN="oficiopl.com"
```

### 7.3 Performance Considerations

**Frontend Optimization**
- Server-side rendering for initial page load
- Client-side navigation for subsequent pages
- Code splitting with Next.js automatic optimization
- Image optimization (future enhancement)
- Lazy loading of heavy components

**Backend Optimization**
- Database query optimization with indexes
- Connection pooling via Supabase
- Efficient Prisma queries with select/include
- Caching strategy (future enhancement)

**File Handling**
- Streaming large files instead of loading in memory
- Cloudflare R2 CDN for fast delivery
- Pre-signed URLs for secure access

**Database Optimization**
- Strategic indexes on frequently queried columns
- Efficient relationship queries
- Pagination for large datasets
- Aggregation at database level

### 7.4 Monitoring & Logging

**Application Logs**
- Console logs for development
- Structured logging (future: Winston/Pino)
- Error tracking (future: Sentry)

**Audit Logs**
- Database-backed audit trail
- Searchable via admin UI
- Indefinite retention

**Performance Monitoring**
- Vercel Analytics (if deployed on Vercel)
- Database query performance via Prisma
- API response time tracking (future enhancement)

**Error Handling**
- Try-catch blocks in all API routes
- Error boundaries in React components
- User-friendly error messages
- Toast notifications for feedback

---

## 8. Scalability Considerations

### 8.1 Current Architecture Limits

**Database**
- Supabase free tier: 500MB database, 2GB bandwidth
- Production tier: Unlimited database, 50GB bandwidth
- Connection limit: ~15 concurrent (with pooling)

**File Storage**
- R2 free tier: 10GB storage, unlimited egress
- No practical limit for this use case

**Email**
- Gmail: 500 emails/day
- Resend free: 100 emails/day
- Resend paid: 50k+ emails/month

**Serverless Functions (Vercel)**
- 10-second timeout on free tier
- 60-second timeout on paid tier
- 100GB execution time/month on free tier

### 8.2 Scaling Strategy

**Vertical Scaling** (Current)
- Upgrade Supabase plan for more connections
- Upgrade Vercel plan for longer timeouts
- Upgrade email provider plan for volume

**Horizontal Scaling** (Future)
- Stateless serverless functions already horizontally scalable
- Database read replicas for read-heavy workloads
- CDN edge caching for static assets

**Performance Optimization**
- Implement Redis caching for frequently accessed data
- Add full-text search with PostgreSQL
- Optimize database queries with EXPLAIN ANALYZE
- Implement pagination everywhere
- Add background job processing (future)

### 8.3 Database Scaling

**Query Optimization**
- All tables have strategic indexes
- Prisma generates optimized queries
- Relationship loading optimized with select/include

**Connection Pooling**
- PgBouncer via Supabase
- Prisma connection pooling
- Efficient connection management

**Future Optimizations**
- Database partitioning by date (invoices, payments)
- Archival strategy for old data
- Read replicas for reporting queries

### 8.4 File Storage Scaling

**Current**
- Cloudflare R2 has no egress fees
- Handles CDN delivery efficiently
- Scales automatically

**Future**
- Implement file compression for PDFs
- Add image optimization if images added
- Implement CDN cache headers

### 8.5 Background Jobs (Future Enhancement)

**Current Limitation**
- All processing is synchronous
- Invoice generation blocks until complete
- Email sending blocks API response

**Future Solution**
- Implement job queue (BullMQ, Celery)
- Background workers for:
  - Batch invoice generation
  - Email sending
  - PDF generation
  - Report generation
  - Renewal reminders

**Benefits**
- Faster API responses
- Better user experience
- Ability to handle larger batches
- Retry failed operations

---

## 9. Future Enhancements

### 9.1 Short-Term (Next 3-6 Months)

**Feature Enhancements**
- ✅ Automated email reminders for overdue invoices
- ✅ Contract renewal email notifications
- ✅ Payment receipt email confirmation
- ✅ Dashboard widgets customization
- ✅ Advanced search and filtering
- ✅ Export reports to PDF/Excel

**Technical Improvements**
- ✅ Implement Redis caching layer
- ✅ Add background job processing
- ✅ Error tracking with Sentry
- ✅ Performance monitoring
- ✅ Automated testing (unit, integration, e2e)
- ✅ CI/CD pipeline

**User Experience**
- ✅ Dark mode support
- ✅ Mobile responsive improvements
- ✅ Keyboard shortcuts
- ✅ Bulk operations UI improvements
- ✅ In-app notifications

### 9.2 Medium-Term (6-12 Months)

**Advanced Features**
- ✅ Multi-currency support
- ✅ Recurring invoice automation
- ✅ Payment gateway integration (Stripe, PayPal)
- ✅ Digital signature capture for contracts
- ✅ Client portal (view invoices, make payments)
- ✅ Advanced reporting with custom date ranges
- ✅ Budget forecasting

**Integration**
- ✅ Accounting software integration (QuickBooks, Xero)
- ✅ Calendar integration for renewal reminders
- ✅ SMS notifications via Twilio
- ✅ WhatsApp notifications

**Analytics**
- ✅ Revenue trends and forecasting
- ✅ Client lifetime value analysis
- ✅ Payment behavior analytics
- ✅ Contract renewal predictions

### 9.3 Long-Term (12+ Months)

**Enterprise Features**
- ✅ Multi-tenant support (for franchises)
- ✅ Advanced RBAC with custom roles
- ✅ API for third-party integrations
- ✅ Webhook support for events
- ✅ White-label capability

**AI/ML Features**
- ✅ Predictive analytics for late payments
- ✅ Automated invoice dispute detection
- ✅ Smart renewal recommendations
- ✅ Chatbot for client inquiries

**Mobile Application**
- ✅ Native mobile app (React Native)
- ✅ Push notifications
- ✅ Mobile receipt capture
- ✅ Offline mode

### 9.4 Technical Debt & Improvements

**Code Quality**
- ✅ Comprehensive test coverage (80%+)
- ✅ E2E testing with Playwright
- ✅ API documentation with OpenAPI/Swagger
- ✅ Component documentation with Storybook
- ✅ Code quality gates with SonarQube

**Infrastructure**
- ✅ Kubernetes deployment option
- ✅ High availability setup
- ✅ Disaster recovery plan
- ✅ Automated backups and restoration
- ✅ Multi-region deployment

**Security**
- ✅ Penetration testing
- ✅ Security audit
- ✅ GDPR compliance enhancements
- ✅ Two-factor authentication (2FA)
- ✅ Single Sign-On (SSO) support

---

## Appendix

### A. Technology Choices Rationale

**Next.js 16**
- Full-stack framework (frontend + backend)
- Server-side rendering for better SEO and performance
- API routes for backend logic
- File-based routing
- Excellent TypeScript support

**React 19**
- Component-based architecture
- Rich ecosystem
- Excellent developer experience
- Strong community support

**TypeScript**
- Type safety reduces bugs
- Better IDE support
- Self-documenting code
- Scales well with team growth

**Prisma**
- Type-safe database queries
- Excellent TypeScript integration
- Migration management
- Developer-friendly API

**PostgreSQL**
- Robust relational database
- ACID compliance
- Excellent for financial data
- Rich query capabilities

**Cloudflare R2**
- S3-compatible, easy migration
- No egress fees
- Cost-effective
- High performance

**NextAuth.js**
- De-facto auth for Next.js
- Session management built-in
- Multiple provider support
- Secure by default

**Tailwind CSS**
- Utility-first approach
- Fast development
- Consistent design
- Small bundle size

### B. Glossary

**Terms**
- **Client**: Property lease customer
- **Contract**: Legal lease agreement
- **Invoice**: Billing document for rent payment
- **Payment**: Money received from client
- **Receipt**: Proof of payment document
- **Rental Rate**: Monthly/periodic rent amount
- **Billing Terms**: Payment frequency (monthly, quarterly, etc.)
- **Withholding Tax**: 5% tax withheld at source
- **VAT**: 12% value-added tax
- **Approval Request**: Workflow for sensitive operations
- **Audit Log**: Record of system activities

**Acronyms**
- **RBAC**: Role-Based Access Control
- **CRUD**: Create, Read, Update, Delete
- **JWT**: JSON Web Token
- **SSR**: Server-Side Rendering
- **CSR**: Client-Side Rendering
- **ORM**: Object-Relational Mapping
- **API**: Application Programming Interface
- **PDF**: Portable Document Format
- **SMTP**: Simple Mail Transfer Protocol
- **R2**: Cloudflare Object Storage

### C. API Endpoint Reference

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for comprehensive API reference (to be created).

### D. Database Schema Reference

See [prisma/schema.prisma](../prisma/schema.prisma) for complete schema definition.

---

**Document Version**: 1.0
**Last Updated**: February 25, 2025
**Author**: System Design Documentation
**Contact**: Development Team
