# Email Notification Setup Guide

This guide will help you set up email notifications for support messages using Resend.com.

## Prerequisites

- Supabase CLI installed
- Resend.com API key (you should already have this from `send-auth-email`)
- Admin email: `learnirwair@gmail.com`

## Setup Steps

### 1. Deploy the Edge Function

```bash
cd "d:\Yuga Yatra\nkc-Test-platform"
supabase functions deploy send-support-notification
```

### 2. Set Environment Variables

In your Supabase Dashboard:
1. Go to **Project Settings** > **Edge Functions** > **Manage Secrets**
2. Add/verify these secrets:
   - `RESEND_API_KEY` - Your Resend.com API key (should already exist)
   - `ADMIN_EMAIL` - Set to `learnirwair@gmail.com`

Or use CLI:
```bash
supabase secrets set ADMIN_EMAIL=learnirwair@gmail.com
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

### 3. Run the Database Migration

**Option A: Using Supabase Dashboard**
1. Go to **SQL Editor** in Supabase Dashboard
2. Copy the contents of `supabase/migrations/20260202_support_email_notifications.sql`
3. Paste and run the SQL

**Option B: Using Supabase CLI**
```bash
supabase db push
```

### 4. Enable pg_net Extension (Required for trigger)

In Supabase Dashboard > SQL Editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 5. Configure Database Secrets (for trigger to call Edge Function)

In Supabase Dashboard > SQL Editor, run:
```sql
-- Store your Supabase URL and Service Role Key in vault
-- Replace YOUR_PROJECT_URL and YOUR_SERVICE_ROLE_KEY with actual values

SELECT vault.create_secret(
  'https://YOUR_PROJECT_ID.supabase.co',
  'SUPABASE_URL'
);

SELECT vault.create_secret(
  'YOUR_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
);
```

**Where to find these values:**
- **SUPABASE_URL**: Project Settings > API > Project URL
- **SUPABASE_SERVICE_ROLE_KEY**: Project Settings > API > service_role key (keep this secret!)

## Alternative: Simpler Webhook Approach (Recommended)

If the pg_net approach is too complex, use Supabase Database Webhooks:

### Setup Webhook in Supabase Dashboard

1. Go to **Database** > **Webhooks**
2. Click **Create a new hook**
3. Configure:
   - **Name**: `send-support-email`
   - **Table**: `support_messages`
   - **Events**: Check `INSERT`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-support-notification`
   - **HTTP Headers**:
     ```
     Content-Type: application/json
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     ```
   - **HTTP Params**: Leave empty or use:
     ```json
     {
       "name": "{{ record.name }}",
       "email": "{{ record.email }}",
       "phone": "{{ record.phone }}",
       "message": "{{ record.message }}",
       "created_at": "{{ record.created_at }}"
     }
     ```

4. Click **Create webhook**

This approach is simpler and doesn't require the pg_net extension!

## Testing

### Test the Edge Function Directly

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-support-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "1234567890",
    "message": "This is a test support message"
  }'
```

### Test via Support Form

1. Go to your app's support page
2. Fill out the form with test data
3. Submit
4. Check `learnirwair@gmail.com` for the notification email

## Troubleshooting

### Email not received?

1. **Check Edge Function logs**: Supabase Dashboard > Edge Functions > Logs
2. **Verify Resend API key**: Make sure it's set correctly
3. **Check spam folder**: Emails might be filtered
4. **Verify webhook**: Database > Webhooks > Check webhook status

### Trigger not firing?

1. **Check if pg_net is enabled**: Run `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
2. **Check trigger exists**: Run `SELECT * FROM pg_trigger WHERE tgname = 'on_support_message_created';`
3. **View logs**: Check Supabase logs for errors

## Files Created

- ✅ `supabase/functions/send-support-notification/index.ts` - Edge Function
- ✅ `supabase/migrations/20260202_support_email_notifications.sql` - Database migration
- ✅ This setup guide

## Next Steps

After setup is complete, every new support message will:
1. Create an in-app notification for admins (existing functionality)
2. Send an email to `learnirwair@gmail.com` with the support message details
