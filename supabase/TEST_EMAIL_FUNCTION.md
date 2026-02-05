# Test Edge Function with curl

## Get your Service Role Key first
Go to Supabase Dashboard > Project Settings > API > Copy the `service_role` key

## Test Command

Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key:

```bash
curl -X POST https://ajxtouqthtdenhqcvdft.supabase.co/functions/v1/send-support-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "1234567890",
    "message": "This is a test support message to verify email notifications are working."
  }'
```

## Expected Response

**Success (200):**
```json
{
  "success": true,
  "messageId": "some-id-from-resend"
}
```

**Error (400):**
```json
{
  "error": "Missing required fields: name, email, message"
}
```

## Check Email

After running the command, check `learnirwair@gmail.com` for the test email.

## Troubleshooting

If you get a 400 error, the webhook payload format might be wrong. The webhook needs to send:
- `name` (required)
- `email` (required)  
- `message` (required)
- `phone` (optional)
- `created_at` (optional)

### Check Webhook Payload

In Supabase Dashboard > Database > Webhooks > Your webhook, make sure the HTTP Params is:

```json
{
  "name": "{{ record.name }}",
  "email": "{{ record.email }}",
  "phone": "{{ record.phone }}",
  "message": "{{ record.message }}",
  "created_at": "{{ record.created_at }}"
}
```

**NOT** the default `{{ record }}` which sends the entire database row with extra fields!
