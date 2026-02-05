# Quick Deployment Guide - Webhook Method (Recommended)

The Edge Function is already deployed! Now we just need to connect it to your database using a webhook.

## ✅ Already Completed
- Edge Function deployed: `send-support-notification`
- Environment variable set: `ADMIN_EMAIL=learnirwair@gmail.com`

## 🚀 Final Step: Create Database Webhook

### Go to Supabase Dashboard

1. Open your Supabase project: https://supabase.com/dashboard/project/ajxtouqthtdenhqcvdft
2. Navigate to **Database** → **Webhooks** (in the left sidebar)
3. Click **"Create a new hook"** or **"Enable Webhooks"**

### Configure the Webhook

Fill in these details:

**Basic Settings:**
- **Name**: `send-support-email-notification`
- **Table**: `support_messages`
- **Events**: Check only **INSERT** ✓

**HTTP Request Settings:**
- **Type**: `HTTP Request`
- **Method**: `POST`
- **URL**: `https://ajxtouqthtdenhqcvdft.supabase.co/functions/v1/send-support-notification`

**HTTP Headers:**
Add these two headers:

| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer YOUR_SERVICE_ROLE_KEY` |

> **Where to find SERVICE_ROLE_KEY:**
> Go to **Project Settings** → **API** → Copy the `service_role` key (keep it secret!)

**HTTP Params (Request Body):**
```json
{
  "name": "{{ record.name }}",
  "email": "{{ record.email }}",
  "phone": "{{ record.phone }}",
  "message": "{{ record.message }}",
  "created_at": "{{ record.created_at }}"
}
```

4. Click **"Create webhook"** or **"Confirm"**

## ✅ That's It!

Now whenever someone submits a support message:
1. It gets saved to the database
2. The webhook triggers automatically
3. Your Edge Function sends an email to `learnirwair@gmail.com`

## 🧪 Test It

1. Go to your app's support page
2. Submit a test message
3. Check `learnirwair@gmail.com` for the notification email

---

**Note:** The webhook method is simpler and more reliable than the pg_net trigger approach. It doesn't require any database migrations or extensions!
