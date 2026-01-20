-- Remote Procedure Call to notify all admins
-- This runs with SECURITY DEFINER privileges to bypass RLS
-- Explicitly sets search_path to public to ensure correct table resolution

CREATE OR REPLACE FUNCTION notify_admins_generic(
    p_title TEXT,
    p_message TEXT,
    p_link TEXT,
    p_sender_name TEXT,
    p_sender_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_email TEXT;
    v_admin_id UUID;
BEGIN
    -- Loop through all emails in 'admins' table
    FOR v_admin_email IN SELECT email FROM public.admins LOOP
        
        -- Find profile ID for this admin email (case-insensitive match)
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
                custom_test_id -- Adding potential missing columns just in case, though not used here
            ) VALUES (
                v_admin_id,
                p_title,
                p_message,
                p_link,
                p_sender_name,
                p_sender_email,
                FALSE,
                NOW(),
                NULL
            );
        END IF;
        
    END LOOP;
END;
$$;
