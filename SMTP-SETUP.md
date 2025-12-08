# SMTP Email Setup Instructions

The Coach Email Campaign feature uses SMTP to send emails. You need to configure your SMTP server credentials.

## Required Environment Variables

### Option 1: Gmail (Simplified)
Add the following to your `.env.local` file:

```bash
# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

**Note**: For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password.

### Option 2: Generic SMTP
```bash
# SMTP Configuration for sending emails
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Your App Name
```

## Common SMTP Providers

### Gmail
```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

OR

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Coach System
```

### Outlook/Office 365
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=your-email@outlook.com
SMTP_FROM_NAME=Coach System
```

### Custom SMTP Server
If you have your own SMTP server, use its credentials:
```bash
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587  # or 465 for SSL, 25 for non-secure
SMTP_USER=username
SMTP_PASSWORD=password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Coach System
```

## Testing

1. Add your SMTP credentials to `.env.local`
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Go to `/admin` and log in
4. Click on **Email Campaigns** tab
5. Select teams and send a test email
6. Check the terminal logs for confirmation

## Common Issues

### Error: "SMTP configuration is incomplete"

Make sure all required variables are set:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`

### Error: "Failed to connect to SMTP server"

Check that:
1. Your SMTP credentials are correct
2. The SMTP server allows connections from your IP
3. Your firewall isn't blocking the SMTP port
4. For Gmail, you're using an App Password

### Emails are marked as spam

To reduce spam filtering:
1. Use a verified domain for `SMTP_FROM_EMAIL`
2. Set up SPF and DKIM records for your domain
3. Don't send too many emails too quickly

## Security Best Practices

1. Never commit `.env.local` to version control
2. Use App Passwords instead of regular passwords when available
3. Rotate SMTP passwords regularly
4. Use TLS/SSL when possible (port 587 or 465)

## Support

For SMTP configuration help, consult your email provider's documentation.

