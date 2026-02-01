import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuthEmailPayload {
    email: string
    type: "signup" | "recovery"
    action_link: string
}

function getConfirmationEmailTemplate(actionLink: string): string {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirm Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #18181b; font-size: 28px; font-weight: 700;">Welcome to Testoza!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 30px 40px; color: #52525b; font-size: 16px; line-height: 24px;">
                    <p style="margin: 0 0 20px 0;">Thank you for signing up. Please confirm your email address by clicking the button below:</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${actionLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Confirm Email</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 20px 0 0 0; font-size: 14px; color: #71717a;">If you didn't create an account, you can safely ignore this email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e4e4e7; text-align: center; color: #a1a1aa; font-size: 12px;">
                    <p style="margin: 0;">© ${new Date().getFullYear()} Testoza. All rights reserved.</p>
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

function getRecoveryEmailTemplate(actionLink: string): string {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #18181b; font-size: 28px; font-weight: 700;">Reset Your Password</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 30px 40px; color: #52525b; font-size: 16px; line-height: 24px;">
                    <p style="margin: 0 0 20px 0;">We received a request to reset your password. Click the button below to create a new password:</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${actionLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 20px 0 0 0; font-size: 14px; color: #71717a;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e4e4e7; text-align: center; color: #a1a1aa; font-size: 12px;">
                    <p style="margin: 0;">© ${new Date().getFullYear()} Testoza. All rights reserved.</p>
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

        const { email, type, action_link } = await req.json() as AuthEmailPayload

        if (!email || !type || !action_link) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log("Processing email:", { email, type })

        let subject: string
        let html: string

        if (type === "signup") {
            subject = "Confirm your email address"
            html = getConfirmationEmailTemplate(action_link)
        } else if (type === "recovery") {
            subject = "Reset your password"
            html = getRecoveryEmailTemplate(action_link)
        } else {
            console.error("Unsupported email type:", type)
            return new Response(
                JSON.stringify({ error: "Unsupported email type" }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log("Sending email via Resend...")
        const { data, error } = await resend.emails.send({
            from: "Testoza <testoza@nymintra.com>",
            to: email,
            subject,
            html,
        })

        if (error) {
            console.error("Resend error:", error)
            return new Response(
                JSON.stringify({ error: "Failed to send email", details: error }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log("Email sent successfully:", data?.id)
        return new Response(
            JSON.stringify({ success: true, messageId: data?.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error("Error processing request:", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
