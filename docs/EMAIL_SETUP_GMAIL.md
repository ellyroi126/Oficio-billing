# Gmail SMTP Setup Guide

This guide will help you set up Gmail SMTP for sending invoice emails from your Oficio Billing application.

## Prerequisites

- A Gmail account (e.g., `info@oficiopl.com`)
- 2-Factor Authentication enabled on your Google account

## Setup Steps

### 1. Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Follow the prompts to enable 2FA if not already enabled

### 2. Generate App Password

1. Go to https://myaccount.google.com/apppasswords
   - Or navigate: Google Account → Security → 2-Step Verification → App passwords
2. Click **Select app** and choose **Mail**
3. Click **Select device** and choose **Other (Custom name)**
4. Enter a name like: `Oficio Billing App`
5. Click **Generate**
6. Google will display a 16-character password (e.g., `abcd efgh ijkl mnop`)
7. **Copy this password** - you won't be able to see it again

### 3. Update Your .env File

Add the following to your `.env` file:

```bash
# Email Service Configuration
EMAIL_PROVIDER="gmail"

# Gmail SMTP
GMAIL_USER="info@oficiopl.com"
GMAIL_APP_PASSWORD="abcdefghijklmnop"  # Remove spaces from the generated password
```

**Important**: Remove all spaces from the app password when pasting it.

### 4. Test the Configuration

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. In your application:
   - Go to the Invoices page
   - Select a pending invoice
   - Click "Send Invoice"
   - Check the recipient's email inbox

### 5. Verify Email Delivery

Check the console logs for confirmation:
```
Email sent successfully via Gmail
Message ID: <unique-message-id>
```

## Troubleshooting

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solutions:**
- Double-check that 2FA is enabled
- Regenerate the App Password
- Make sure you're using the App Password, not your regular Gmail password
- Remove all spaces from the App Password

### Error: "Error: self signed certificate in certificate chain"

**Solution:**
- This is usually a network/proxy issue
- Try running the app from a different network
- Check if your company/network has SSL inspection enabled

### Emails Going to Spam

**Solutions:**
- Ask recipients to mark your emails as "Not Spam"
- Consider setting up SPF/DKIM records for your domain (requires domain ownership)
- Switch to Resend with verified domain for better deliverability

### Daily Sending Limit Reached

**Gmail Limits:**
- Free Gmail accounts: 500 emails per day
- Google Workspace accounts: 2,000 emails per day

**Solution:**
- If you need to send more emails, consider upgrading to Resend
- Monitor your daily sending volume

## Gmail SMTP Specifications

For reference, here are the SMTP settings used by the app:

- **SMTP Server**: `smtp.gmail.com`
- **Port**: 465 (SSL) or 587 (TLS)
- **Authentication**: Required
- **Username**: Your Gmail address
- **Password**: App-specific password

## Security Notes

1. **Never commit your .env file** to version control
2. The `.env` file is already in `.gitignore`
3. App passwords are more secure than using your main password
4. Revoke app passwords you're no longer using
5. Each app/device should have its own app password

## Switching to Resend Later

If you want to switch to Resend in the future:

1. Follow the [Resend Setup Guide](./EMAIL_SETUP_RESEND.md)
2. Change `EMAIL_PROVIDER` to `"resend"` or `"auto"` in your `.env`
3. The app will automatically use Resend instead

## Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify your app password is correct
3. Ensure 2FA is enabled on your Google account
4. Try regenerating the app password

For more help, contact your development team or check Google's [App Password Help](https://support.google.com/accounts/answer/185833).
