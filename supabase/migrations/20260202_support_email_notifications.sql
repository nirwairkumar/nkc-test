-- Enable pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enhanced Trigger Function to notify admins on new support message
-- This version sends both in-app notifications AND email notifications via Edge Function
CREATE OR REPLACE FUNCTION handle_new_support_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_email TEXT;
    v_admin_id UUID;
    v_link TEXT;
    v_edge_function_url TEXT;
    v_service_role_key TEXT;
    v_payload JSONB;
BEGIN
    -- Construct the Deep Link
    v_link := 'support://details?' || 
              'name=' || COALESCE(NEW.name, '') || 
              '&email=' || COALESCE(NEW.email, '') || 
              '&phone=' || COALESCE(NEW.phone, '') || 
              '&message=' || substring(COALESCE(NEW.message, ''), 1, 500) || 
              '&id=' || NEW.id::text;

    -- Loop through all emails in 'admins' table to create in-app notifications
    FOR v_admin_email IN SELECT email FROM public.admins LOOP
        
        -- Find profile ID for this admin email (case-insensitive)
        SELECT id INTO v_admin_id 
        FROM public.profiles 
        WHERE LOWER(email) = LOWER(v_admin_email) 
        LIMIT 1;

        -- If Admin User Found, Insert Notification
        IF v_admin_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                user_id, 
                title, 
                message, 
                link, 
                sender_name, 
                sender_email, 
                read,
                created_at,
                custom_test_id
            ) VALUES (
                v_admin_id,
                'New Support Message: ' || NEW.name,
                substring(NEW.message, 1, 60) || '...',
                v_link,
                NEW.name,
                NEW.email,
                FALSE,
                NOW(),
                NULL
            );
        END IF;
        
    END LOOP;

    -- Send Email Notification via Edge Function
    BEGIN
        -- Get Supabase project URL from vault/secrets
        -- You need to set these in Supabase Dashboard > Project Settings > Vault
        SELECT decrypted_secret INTO v_edge_function_url 
        FROM vault.decrypted_secrets 
        WHERE name = 'SUPABASE_URL' 
        LIMIT 1;
        
        SELECT decrypted_secret INTO v_service_role_key 
        FROM vault.decrypted_secrets 
        WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' 
        LIMIT 1;
        
        -- Construct Edge Function URL
        IF v_edge_function_url IS NOT NULL THEN
            v_edge_function_url := v_edge_function_url || '/functions/v1/send-support-notification';
        ELSE
            -- Fallback to environment variable or local development
            v_edge_function_url := COALESCE(
                current_setting('app.supabase_url', true),
                'http://localhost:54321'
            ) || '/functions/v1/send-support-notification';
        END IF;

        -- Prepare payload
        v_payload := jsonb_build_object(
            'name', NEW.name,
            'email', NEW.email,
            'phone', NEW.phone,
            'message', NEW.message,
            'created_at', NEW.created_at
        );

        -- Call Edge Function using pg_net extension
        PERFORM net.http_post(
            url := v_edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || COALESCE(v_service_role_key, '')
            ),
            body := v_payload::text
        );

        -- Log success
        RAISE NOTICE 'Email notification queued for support message ID: %', NEW.id;

    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE WARNING 'Failed to send email notification: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- Recreate the Trigger (drop if exists)
DROP TRIGGER IF EXISTS on_support_message_created ON public.support_messages;

CREATE TRIGGER on_support_message_created
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION handle_new_support_message();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA net TO postgres, anon, authenticated, service_role;
