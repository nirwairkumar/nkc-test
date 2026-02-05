import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SupportNotificationPayload {
    name: string
    email: string
    phone?: string
    message: string
    created_at?: string
}

function getSupportNotificationTemplate(data: SupportNotificationPayload): string {
    const { name, email, phone, message, created_at } = data
    const timestamp = created_at ? new Date(created_at).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short'
    }) : new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short'
    })

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Support Message</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🔔 New Support Message</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 40px;">
                    <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
                      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Sender Information</p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 8px 0; color: #1e293b; font-size: 16px;">
                            <strong>Name:</strong> ${name}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #1e293b; font-size: 16px;">
                            <strong>Email:</strong> <a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email}</a>
                          </td>
                        </tr>
                        ${phone ? `
                        <tr>
                          <td style="padding: 8px 0; color: #1e293b; font-size: 16px;">
                            <strong>Phone:</strong> <a href="tel:${phone}" style="color: #3b82f6; text-decoration: none;">${phone}</a>
                          </td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">
                            <strong>Received:</strong> ${timestamp}
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 4px;">
                      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
                      <p style="margin: 0; color: #1e293b; font-size: 16px; line-height: 24px; white-space: pre-wrap;">${message}</p>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                      <tr>
                        <td align="center">
                          <a href="mailto:${email}?subject=Re: Support Request" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Reply to ${name}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e4e4e7; text-align: center; color: #a1a1aa; font-size: 12px;">
                    <p style="margin: 0;">© ${new Date().getFullYear()} Testoza. All rights reserved.</p>
                    <p style="margin: 10px 0 0 0;">This is an automated notification from your support system.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
        const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'learnirwair@gmail.com'

        // Try to get data from JSON body first, then fall back to URL parameters
        let payload: SupportNotificationPayload

        try {
            // Try JSON body first
            payload = await req.json() as SupportNotificationPayload
        } catch {
            // If JSON parsing fails, try URL parameters (for Supabase webhooks)
            const url = new URL(req.url)
            payload = {
                name: url.searchParams.get('name') || '',
                email: url.searchParams.get('email') || '',
                phone: url.searchParams.get('phone') || undefined,
                message: url.searchParams.get('message') || '',
                created_at: url.searchParams.get('created_at') || undefined,
            }
        }

        console.log("Received payload:", { name: payload.name, email: payload.email, hasMessage: !!payload.message })

        if (!payload.name || !payload.email || !payload.message) {
            return new Response(
                JSON.stringify({
                    error: "Missing required fields: name, email, message",
                    received: { name: payload.name, email: payload.email, message: payload.message }
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log("Processing support notification:", { name: payload.name, email: payload.email })

        const html = getSupportNotificationTemplate(payload)

        console.log("Sending support notification email via Resend...")
        const { data, error } = await resend.emails.send({
            from: "Testoza Support <testoza@nymintra.com>",
            to: adminEmail,
            subject: `New Support Message from ${payload.name}`,
            html,
            reply_to: payload.email, // Allow direct reply to the user
        })

        if (error) {
            console.error("Resend error:", error)
            return new Response(
                JSON.stringify({ error: "Failed to send email", details: error }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log("Support notification email sent successfully:", data?.id)
        return new Response(
            JSON.stringify({ success: true, messageId: data?.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error("Error processing support notification:", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
