# 🔧 WEBHOOK FIX - Correct Configuration

## The Problem

Your webhook is sending data as URL query parameters:
```
?name=record.name&email=record.email
```

Instead of JSON in the request body:
```json
{"name":"actual name","email":"actual@email.com"}
```

## The Solution

In Supabase Dashboard > Database > Webhooks > Your webhook:

### ❌ WRONG - What you have now:
**HTTP Parameters** with separate key-value pairs:
```
name → record.name
email → record.email
message → record.message
created_at → record.created_at
```

### ✅ CORRECT - What you need:

**Delete all those individual parameters** and instead:

1. **Method**: POST ✓ (keep this)
2. **URL**: `https://ajxtouqthtdenhqcvdft.supabase.co/functions/v1/send-support-notification` ✓ (keep this)
3. **HTTP Headers**: (keep these)
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

4. **HTTP Params / Body**: Click the dropdown and select **"JSON"** or **"Custom"** mode, then paste:

```json
{
  "name": "{{ record.name }}",
  "email": "{{ record.email }}",
  "message": "{{ record.message }}",
  "created_at": "{{ record.created_at }}"
}
```

## Important Notes

- The `{{ record.fieldname }}` syntax tells Supabase to insert the actual values
- Make sure it's in **JSON format** in the body, NOT as individual parameters
- The webhook interface might have a toggle between "Form" and "JSON" - use **JSON**

## After Fixing

1. Save the webhook
2. Submit a test support message from your app
3. Check `learnirwair@gmail.com` for the notification email
4. Check Supabase logs - you should see status 200 instead of 400
