# Email Tool Setup Guide

Complete guide for setting up the admin email tool for App Ideas Finder.

## Step 1: Install Dependencies

The email tool uses `react-quill` for the WYSIWYG editor. Install it:

```bash
npm install react-quill
```

## Step 2: Run Database Migration

Run the SQL migration to create the email campaigns and tracking tables:

1. Go to your Supabase Dashboard → SQL Editor
2. Run the contents of `add-email-campaigns-tables.sql`
3. This creates:
   - `email_campaigns` - Stores email campaigns
   - `email_recipients` - Tracks individual email sends and opens
   - `email_settings` - Stores email configuration (reply-to address)

## Step 3: Features

### Email Composition
- **WYSIWYG Editor**: Rich text editor for composing emails
- **Subject Line**: Required field for email subject
- **Recipient Types**:
  - **Waitlist**: All waitlist members
  - **All Users**: All registered users
  - **Subscribers**: Only users with active subscriptions (trial, active, free_unlimited)
  - **Adhoc**: Custom email addresses (comma-separated)

### Email Tracking
- **Open Tracking**: Logo in header includes tracking pixel
- **Open Count**: Tracks how many times each email was opened
- **Sent Status**: Tracks sent, failed, bounced emails
- **Campaign History**: View all sent campaigns with stats

### Email Settings
- **Reply-To Configuration**: Set default reply-to email (default: info@appideasfinder.com)
- **Per-Email Override**: Can override reply-to for individual emails

### Email Template
- **Consistent Header**: Logo and app name (logo includes tracking pixel)
- **Consistent Footer**: Social links, unsubscribe link, copyright
- **Custom Content**: Your WYSIWYG content goes in the middle

## Step 4: Access the Email Tool

1. Go to Admin Dashboard: `/admin`
2. Click on "📧 Email Tool"
3. Or navigate directly to: `/admin/email`

## Step 5: Sending Emails

1. **Compose Email**:
   - Enter subject line
   - Select recipient type
   - If "Adhoc", enter comma-separated email addresses
   - Compose email content using WYSIWYG editor
   - Optionally override reply-to email

2. **Preview Recipients**:
   - Recipient count is shown automatically (except for adhoc)
   - Unsubscribed emails are automatically excluded

3. **Send**:
   - Click "Send Email" button
   - Confirm the send
   - Emails are sent in batches of 50 to avoid rate limiting
   - Progress is tracked in real-time

## Step 6: Tracking Opens

The tracking pixel is embedded in the logo image in the email header. When an email is opened:
1. The tracking pixel loads from `/api/admin/email/track-open?token={tracking_token}`
2. The endpoint records the open event
3. Open count and timestamp are updated in the database

## Additional Considerations

### What Else to Consider:

1. **Rate Limiting**: 
   - Emails are sent in batches of 50 with 1-second delays
   - AWS SES has sending limits (check your SES quota)
   - Consider implementing a queue system for large sends

2. **Bounce Handling**:
   - AWS SES can send bounce notifications via SNS
   - Consider adding webhook handler for bounces
   - Mark bounced emails in database

3. **Unsubscribe Compliance**:
   - Unsubscribed emails are automatically excluded
   - Unsubscribe link is included in footer
   - Consider adding unsubscribe reason tracking

4. **Email Scheduling**:
   - Currently emails are sent immediately
   - Could add scheduling feature for future sends

5. **A/B Testing**:
   - Could add A/B testing for subject lines or content
   - Track which variant performs better

6. **Click Tracking**:
   - Currently only tracks opens
   - Could add click tracking for links in emails

7. **Email Templates**:
   - Could save email templates for reuse
   - Pre-built templates for common scenarios

8. **Analytics Dashboard**:
   - View open rates per campaign
   - Compare campaign performance
   - Track engagement over time

9. **Email Preview**:
   - Preview email before sending
   - Test on different email clients

10. **Bulk Operations**:
    - Export recipient lists
    - Import email lists
    - Segment recipients by criteria

## API Endpoints

- `GET /api/admin/email/recipients?type={type}` - Get recipient count/list
- `POST /api/admin/email/send` - Send email campaign
- `GET /api/admin/email/campaigns` - Get campaign history
- `GET /api/admin/email/campaigns?id={id}` - Get campaign details with stats
- `GET /api/admin/email/settings` - Get email settings
- `PATCH /api/admin/email/settings` - Update email settings
- `GET /api/admin/email/track-open?token={token}` - Track email opens (pixel)

## Database Tables

### email_campaigns
- Stores email campaign metadata
- Tracks send status, recipient counts, etc.

### email_recipients
- Tracks individual email sends
- Stores tracking tokens for open tracking
- Records open counts and timestamps

### email_settings
- Stores email configuration
- Currently: reply_to_email setting

