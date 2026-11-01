-- Count testoza.com/hindi-online-test-maker (frontend/src/guides) as a Marketing landing, not App.
-- Same function as 20261002140000_analytics_guide_how_to_conduct_online_exam.sql (live on
-- 3 October 2026) with this path added, so run it after that one; safe to run more than once.

CREATE OR REPLACE FUNCTION public.analytics_landing_type(p_sitename text, p_path text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_sitename LIKE 'pdf.%' OR p_path = '/convert' OR p_path ~ '^/pdf(/|$)' THEN 'PDF tools'
        WHEN p_sitename LIKE 'blog.%' OR p_sitename LIKE 'news.%'
             OR p_path ~ '^/(news|blog|posts)(/|$)' THEN 'Blog'
        WHEN p_path ~ '^/(test|live|test-intro|combined-intro|combined-break)/' THEN 'Test link'
        WHEN p_path ~ '^/(results|test-submitted|solutions|test-analysis|feedback)(/|$)' THEN 'Results'
        WHEN p_path ~ '^/(explore|more-tests|tests|creator)(/|$)' THEN 'Discovery'
        WHEN p_path ~ '^/(login|auth|auth-error|onboarding|update-password)(/|$)' THEN 'Sign-in'
        WHEN p_path = '/'
             OR p_path ~ '^/(about|pricing|premium|support|privacy-policy|terms-and-conditions|user-guide|compare|ai-question-generator|ai-test-generator|assessment-platform|auto-grading-software|best-online-test-platform|cbt-exam-software|create-mock-test-online|exam-software-for-schools|hindi-online-test-maker|how-to-conduct-online-exam|jee-mock-test-platform|mcq-test-maker|moodle-alternative|neet-online-test-software|online-exam-software|online-proctoring-software|online-quiz-maker|online-test-for-coaching|online-test-maker|pdf-to-quiz|quiz-creator|white-label-test-platform|youtube-to-quiz|survey)(/|$)'
             THEN 'Marketing'
        ELSE 'App'
    END
$$;
