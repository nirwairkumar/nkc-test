-- Trigger Function to notify admins on new support message
-- Runs on server side, SECURITY DEFINER, bypassing client RLS

-- 1. Create the function that will be called by the trigger
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
BEGIN
    -- Construct the Deep Link
    -- Note: Trigger payload is in NEW variable
    v_link := 'support://details?' || 
              'name=' || COALESCE(NEW.name, '') || 
              '&email=' || COALESCE(NEW.email, '') || 
              '&phone=' || COALESCE(NEW.phone, '') || 
              '&message=' || substring(COALESCE(NEW.message, ''), 1, 500) || 
              '&id=' || NEW.id::text;

    -- Loop through all emails in 'admins' table
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

    RETURN NEW;
END;
$$;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS on_support_message_created ON public.support_messages;

CREATE TRIGGER on_support_message_created
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION handle_new_support_message();
