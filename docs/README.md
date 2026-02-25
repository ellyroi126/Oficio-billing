# Oficio Billing Documentation

Welcome to the Oficio Billing System documentation. This folder contains comprehensive guides and technical documentation for the system.

## 📚 Documentation Index

### Getting Started

**[EMAIL_QUICKSTART.md](./EMAIL_QUICKSTART.md)** - Start here!
- Quick decision guide for email providers
- 5-minute Gmail SMTP setup
- Email configuration options
- Testing instructions

### Email Setup Guides

**[EMAIL_SETUP_GMAIL.md](./EMAIL_SETUP_GMAIL.md)**
- Gmail SMTP detailed setup (5 minutes)
- App Password generation
- Troubleshooting common issues
- Gmail sending limits and best practices

**[EMAIL_SETUP_RESEND.md](./EMAIL_SETUP_RESEND.md)**
- Resend setup with domain verification (30 minutes)
- DNS configuration guide
- Professional email setup
- Comparison with Gmail
- Production deployment guide

### Technical Documentation

**[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** - Comprehensive system design
- Executive summary
- Complete architecture (8 layers)
- Data model and relationships
- Core modules (9 modules documented)
- Security & RBAC
- External integrations
- Scalability strategy
- Future roadmap

**[ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)** - Visual diagrams
- High-level architecture
- Data flow diagrams
- Component hierarchy
- Database schema
- Security layers

## 🗂️ Documentation by Topic

### For New Users
1. Start with [EMAIL_QUICKSTART.md](./EMAIL_QUICKSTART.md)
2. Set up email following Gmail or Resend guide
3. Review [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 1 (Overview)

### For Developers
1. Read [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - Complete technical overview
2. Review [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) - Visual reference
3. Check root [EMAIL_INTEGRATION_SUMMARY.md](../EMAIL_INTEGRATION_SUMMARY.md) - Email features

### For System Administrators
1. [EMAIL_SETUP_RESEND.md](./EMAIL_SETUP_RESEND.md) - Production email setup
2. [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 7 - Infrastructure
3. [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 8 - Scalability

### For Product Managers
1. [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 1 - System Overview
2. [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 4 - Core Modules
3. [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 9 - Future Enhancements

## 📖 Quick Reference

### Email Configuration
```env
# Quick Gmail Setup (5 min)
EMAIL_PROVIDER="gmail"
GMAIL_USER="info@oficiopl.com"
GMAIL_APP_PASSWORD="your_16_char_password"

# Resend Setup (30 min)
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_your_key"
RESEND_DOMAIN="oficiopl.com"

# Auto Fallback (Best)
EMAIL_PROVIDER="auto"
# Configure both above
```

### Core Features
- **Client Management**: CRUD, bulk operations, Excel import/export
- **Contract Management**: Auto-generation, PDF storage, renewal tracking
- **Invoice Management**: Auto-generation, VAT/tax calculation, email delivery
- **Payment Processing**: Recording, evidence upload, receipt generation
- **Reporting**: Contract status, renewals, billing, revenue analytics
- **RBAC**: Admin and Employee roles with approval workflows
- **Audit Logging**: Comprehensive activity tracking

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Auth**: NextAuth.js with JWT
- **Email**: Resend API + Gmail SMTP (dual provider)

## 🔍 Find What You Need

### I want to...

**Set up email sending**
→ [EMAIL_QUICKSTART.md](./EMAIL_QUICKSTART.md)

**Understand the system architecture**
→ [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 2

**See visual diagrams**
→ [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)

**Learn about data models**
→ [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 3

**Understand core features**
→ [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 4

**Review security measures**
→ [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 5

**Plan for scaling**
→ [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 8

**See future roadmap**
→ [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) Section 9

## 📝 Documentation Standards

All documentation follows these principles:
- **Clear structure** with table of contents
- **Practical examples** with code snippets
- **Step-by-step guides** where applicable
- **Visual aids** (ASCII diagrams)
- **Troubleshooting sections**
- **Version tracking** at document end

## 🤝 Contributing

When updating documentation:
1. Maintain consistent formatting
2. Update version and date at bottom
3. Add examples where helpful
4. Link to related documents
5. Test all code snippets

## 📧 Support

For questions or clarifications:
- Check documentation first
- Review relevant guides
- Consult system design document
- Contact development team

---

**Documentation Version**: 1.0
**Last Updated**: February 25, 2025
**Total Pages**: 6 documents
