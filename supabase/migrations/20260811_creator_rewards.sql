-- Creator Rewards System Migration
-- Helper function to calculate creator reward metrics & quality tests count (20+ submissions per test)

CREATE OR REPLACE FUNCTION get_creator_rewards_stats(p_creator_id UUID)
RETURNS TABLE (
    total_tests INT,
    quality_tests_count INT,
    total_submissions INT
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_total_tests INT := 0;
    v_quality_tests INT := 0;
    v_total_submissions INT := 0;
BEGIN
    -- 1. Count total tests created by user (excluding system tour/example tests)
    SELECT COUNT(*) INTO v_total_tests
    FROM public.tests
    WHERE created_by = p_creator_id
      AND COALESCE((settings->>'is_example_template')::boolean, false) = false
      AND COALESCE((settings->>'is_user_example')::boolean, false) = false;

    -- 2. Calculate quality tests (tests with >= 20 submissions) & total submissions
    WITH test_counts AS (
        SELECT 
            t.id,
            COUNT(ut.id) AS submission_count
        FROM public.tests t
        LEFT JOIN public.user_tests ut ON ut.test_id = t.id
        WHERE t.created_by = p_creator_id
          AND COALESCE((t.settings->>'is_example_template')::boolean, false) = false
          AND COALESCE((t.settings->>'is_user_example')::boolean, false) = false
        GROUP BY t.id
    )
    SELECT 
        COUNT(CASE WHEN submission_count >= 20 THEN 1 END),
        COALESCE(SUM(submission_count), 0)
    INTO v_quality_tests, v_total_submissions
    FROM test_counts;

    RETURN QUERY SELECT v_total_tests, v_quality_tests, v_total_submissions;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_creator_rewards_stats(UUID) TO authenticated, anon;
