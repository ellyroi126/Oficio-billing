# Authentication Setup Guide

This guide explains how to set up and use the authentication system in the Oficio Billing application.

## Overview

The application uses **NextAuth.js** with credentials-based authentication. Users are authenticated with email and password, and sessions are managed using JWT tokens.

## Features

- ✅ Secure login with email and password
- ✅ Password hashing with bcryptjs
- ✅ JWT-based sessions (30-day expiry)
- ✅ Protected routes via middleware
- ✅ No public registration (admin-only user creation)
- ✅ Logout functionality

## Setup Instructions

### 1. Environment Variables

Ensure your `.env` file has the following variable:

```env
# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-generate-with-openssl-rand-base64-32"
```

To generate a secure `NEXTAUTH_SECRET`, run:

```bash
openssl rand -base64 32
```

### 2. Database Schema

The authentication system uses the `User` model in Prisma. Ensure your database is up to date:

```bash
npx prisma db push
```

The User model includes:
- `id` (unique identifier)
- `email` (unique, used for login)
- `name` (optional)
- `password` (hashed with bcryptjs)
- `createdAt` and `updatedAt` timestamps

### 3. Create Your First User

You have two options to create user accounts:

#### Option A: Interactive Script (Recommended)

```bash
node scripts/create-user.js
```

You'll be prompted to enter:
- Full Name
- Email
- Password (minimum 8 characters)
- Confirm Password

Example:
```
=== Oficio Billing - Create User ===

Full Name: John Doe
Email: john@oficiopl.com
Password: ********
Confirm Password: ********

✅ User created successfully!

User Details:
- ID: clx...
- Name: John Doe
- Email: john@oficiopl.com
- Created: 2/12/2026, 10:30:00 AM

User can now log in at /login
```

#### Option B: Non-Interactive Script

For automation or quick user creation:

```bash
node scripts/create-user-simple.js "Full Name" "email@example.com" "password"
```

Example:
```bash
node scripts/create-user-simple.js "John Doe" "john@oficiopl.com" "mypassword123"
```

## Using the System

### Login

1. Navigate to `/login`
2. Enter your email and password
3. Click "Sign in"
4. You'll be redirected to the dashboard

### Logout

Click the "Logout" button in the sidebar (bottom left) to sign out. You'll be redirected to the login page.

### Protected Routes

All routes except `/login` are protected. Unauthenticated users will be automatically redirected to the login page.

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts          # NextAuth configuration
│   └── login/
│       └── page.tsx                  # Login page
├── components/
│   ├── providers/
│   │   └── AuthProvider.tsx         # Session provider wrapper
│   └── layout/
│       └── Sidebar.tsx              # Includes logout button
├── middleware.ts                     # Route protection
├── types/
│   └── next-auth.d.ts               # TypeScript types
└── scripts/
    └── create-user.js               # User creation script
```

## Security Features

### Password Security
- Passwords are hashed using bcryptjs with salt rounds (10)
- Plain-text passwords are never stored in the database
- Minimum password length: 8 characters

### Session Security
- Sessions use JWT tokens (stored in HTTP-only cookies)
- 30-day session expiry
- Sessions are validated on each request via middleware

### Route Protection
- All routes protected except `/login` and public assets
- Middleware handles authentication checks
- Unauthorized users redirected to login page

## Troubleshooting

### "Invalid email or password" Error
- Double-check your credentials
- Ensure the user account exists (check database or create new user)
- Verify password is correct (case-sensitive)

### Can't Access Protected Routes
- Ensure you're logged in
- Check that `NEXTAUTH_SECRET` is set in `.env`
- Clear browser cookies and try logging in again

### User Creation Script Fails
- Verify database connection in `.env`
- **Important**: Check your network connection to Supabase (if using Supabase)
- Ensure Prisma schema is pushed: `npx prisma db push`
- Check that email doesn't already exist in database
- If using Supabase, ensure your IP is whitelisted in the Supabase dashboard

## Creating Additional Users

Only administrators with access to the server can create new users. To create additional accounts:

```bash
node scripts/create-user.js
```

There is no public registration page by design. This ensures only authorized personnel have access to the billing system.

## API Endpoints

### NextAuth Routes (handled automatically)
- `GET/POST /api/auth/signin` - Sign in
- `GET/POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session
- `GET /api/auth/csrf` - Get CSRF token

## Development Notes

### Updating User Schema
If you modify the User model in Prisma:

1. Update `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Regenerate Prisma client: `npx prisma generate`

### Changing Session Duration
Edit `authOptions` in `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days (in seconds)
}
```

## Production Deployment

Before deploying to production:

1. ✅ Set strong `NEXTAUTH_SECRET` (minimum 32 characters)
2. ✅ Update `NEXTAUTH_URL` to your production domain
3. ✅ Ensure database is accessible from production server
4. ✅ Create admin user accounts on production
5. ✅ Test login/logout flow thoroughly
6. ✅ Verify all protected routes work correctly

## Support

For issues or questions about authentication, contact the development team.
