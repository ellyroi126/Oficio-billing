# Oficio Billing

A contract and billing management system for Oficio Property Leasing. This application handles client management, contract generation, and billing operations.

## Features

- **Client Management** - Create, view, edit, and delete clients with multiple contacts
- **Contract Generation** - Generate professional contracts in DOCX and PDF formats
- **Batch Generation** - Generate contracts for multiple clients at once
- **Company Settings** - Configure company details and contract signers
- **Dynamic Billing Terms** - Support for Monthly, Quarterly, Semi-Annual, Annual, and custom billing terms

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Styling:** Tailwind CSS
- **Document Generation:** docx (Word), pdf-lib (PDF)
- **Language:** TypeScript

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)
- Access to a [Supabase](https://supabase.com/) project (or PostgreSQL database)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ellyroi126/Oficio-billing.git
cd Oficio-billing
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your actual values:

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

> **Note:** Contact your team lead for the actual database credentials.

### 4. Set Up the Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 5. Start the Development Server

```bash
npm run dev
```

### 6. Open the Application

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
oficio-billing/
├── prisma/
│   └── schema.prisma       # Database schema
├── public/
│   ├── Oficio_logo.png     # Company logo for contracts
│   └── contracts/          # Generated contract files
├── src/
│   ├── app/
│   │   ├── (dashboard)/    # Dashboard pages
│   │   │   ├── clients/    # Client management
│   │   │   ├── contracts/  # Contract management
│   │   │   ├── settings/   # Company settings
│   │   │   └── ...
│   │   └── api/            # API routes
│   │       ├── clients/
│   │       ├── contracts/
│   │       └── company/
│   ├── components/
│   │   ├── clients/        # Client-specific components
│   │   ├── contracts/      # Contract-specific components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # Reusable UI components
│   ├── lib/
│   │   ├── contract-template.ts  # DOCX generation
│   │   ├── contract-pdf.ts       # PDF generation
│   │   ├── file-storage.ts       # File handling
│   │   └── prisma.ts             # Database client
│   └── types/
│       └── index.ts        # TypeScript types
└── ...
```

## Usage

### Managing Clients

1. Navigate to **Clients** in the sidebar
2. Click **Add Client** to create a new client
3. Fill in client details, contacts, and billing terms
4. Save the client

### Generating Contracts

**Single Contract:**
1. Navigate to **Contracts** → **Create Contract**
2. Select a client
3. Choose the contract signer
4. Click **Generate Contract**

**Batch Generation:**
1. Navigate to **Contracts** → **Batch Generate**
2. Select multiple clients
3. Choose the contract signer
4. Click **Generate Contracts**

### Downloading Contracts

1. Navigate to **Contracts**
2. Find the contract in the list
3. Click the download icon
4. Choose format (DOCX or PDF)

### Company Settings

1. Navigate to **Settings**
2. Configure company details:
   - Company name and address
   - Contact information
   - Default plan
   - Contract signers/approvers

## Billing Terms

The system supports the following billing terms:

| Term | Description |
|------|-------------|
| Monthly | Monthly service fee |
| Quarterly | Quarterly service fee |
| Semi-Annual | Semi-annual service fee |
| Annual | One year service fee |
| Other | Custom billing terms |

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Verify your `.env` file has the correct credentials
2. Ensure your IP is allowed in Supabase (Settings → Database → Connection Pooling)
3. Try running `npx prisma db push` again

### Contract Generation Errors

If contracts fail to generate:

1. Ensure the `public/Oficio_logo.png` file exists
2. Check that the `public/contracts/` directory exists and is writable
3. Verify the client has a primary contact set

### Prisma Client Issues

If you get Prisma-related errors:

```bash
# Regenerate Prisma client
npx prisma generate

# Reset and push schema (WARNING: This will clear data)
npx prisma db push --force-reset
```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary - Oficio Property Leasing
