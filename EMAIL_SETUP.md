# Email Configuration Setup

This project uses Nodemailer for sending emails. Follow these steps to configure email functionality.

## Environment Variables

Add the following variables to your `.env` file:

```env
# Email Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
APP_URL=http://localhost:3000
```

## Email Provider Setup

### Gmail Setup

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `SMTP_PASS`

### Outlook/Hotmail Setup

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
```

### Yahoo Setup

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@yahoo.com
```

### Custom SMTP Server

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.com
```

## Email Templates

The application includes two email templates:

1. **Welcome Email**: Sent when a user registers
2. **Password Reset Email**: Sent when a user requests password reset

Both templates include:
- HTML and plain text versions
- Responsive design
- Professional styling
- Clear call-to-action buttons

## Testing Email Configuration

You can test the email configuration by calling the email service verification method:

```typescript
const authService = new AuthService(fastify);
const isEmailConfigured = await authService.verifyEmailService();
console.log('Email service configured:', isEmailConfigured);
```

## Security Notes

- Never commit your `.env` file to version control
- Use App Passwords instead of your main password for Gmail
- Consider using environment-specific email configurations
- Monitor email sending logs for any issues

## Troubleshooting

### Common Issues

1. **Authentication Failed**: Check your SMTP credentials and ensure 2FA is properly configured
2. **Connection Timeout**: Verify SMTP host and port settings
3. **Emails Not Sending**: Check firewall settings and ensure the SMTP port is open

### Gmail Specific Issues

- Make sure you're using an App Password, not your regular password
- Ensure "Less secure app access" is not required (use App Passwords instead)
- Check if your account has any sending limits

### Development vs Production

For development, you might want to use a service like:
- **Mailtrap**: For testing emails without sending to real addresses
- **Ethereal Email**: For development testing

For production, use a reliable email service like:
- **SendGrid**
- **Mailgun**
- **Amazon SES**
- **Gmail/Outlook** (for smaller applications)
