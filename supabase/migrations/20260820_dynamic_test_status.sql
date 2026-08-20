-- Migration: Dynamic Timestamp-Derived Test Status
-- Computes the live test status dynamically from settings and schedule timestamps

CREATE OR REPLACE FUNCTION get_test_status(settings jsonb)
RETURNS text AS $$
DECLARE
    conduct jsonb;
    schedule jsonb;
    start_t timestamptz;
    end_t timestamptz;
BEGIN
    IF settings IS NULL THEN
        RETURN 'inactive';
    END IF;

    conduct := settings->'conduct_exam';
    schedule := settings->'schedule';

    -- If conduct exam is not enabled
    IF conduct IS NULL OR (conduct->>'enabled')::boolean IS NOT TRUE THEN
        RETURN 'inactive';
    END IF;

    -- If schedule is configured and enabled
    IF schedule IS NOT NULL AND (schedule->>'enabled')::boolean IS TRUE THEN
        IF schedule->>'start_time' IS NOT NULL AND schedule->>'start_time' != '' THEN
            BEGIN
                start_t := (schedule->>'start_time')::timestamptz;
            EXCEPTION WHEN OTHERS THEN
                start_t := NULL;
            END;
        END IF;

        IF schedule->>'end_time' IS NOT NULL AND schedule->>'end_time' != '' THEN
            BEGIN
                end_t := (schedule->>'end_time')::timestamptz;
            EXCEPTION WHEN OTHERS THEN
                end_t := NULL;
            END;
        END IF;

        -- If scheduled in the future
        IF start_t IS NOT NULL AND NOW() < start_t THEN
            RETURN 'upcoming';
        END IF;

        -- If schedule end time has passed
        IF end_t IS NOT NULL AND NOW() > end_t THEN
            RETURN 'inactive';
        END IF;
    END IF;

    RETURN 'active';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_test_status(t tests)
RETURNS text AS $$
BEGIN
    RETURN get_test_status(t.settings);
END;
$$ LANGUAGE plpgsql STABLE;
