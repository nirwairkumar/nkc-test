-- Count the four "alternative" guides as Marketing landings, not App:
--   /classplus-alternative  /teachmint-alternative
--   /kahoot-alternative     /testportal-alternative
--
-- Includes everything 20261009160000 added (and so everything before it), so it is safe
-- whether or not that migration has been run, and safe to run more than once.

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
             OR p_path ~ '^/(about|pricing|premium|support|privacy-policy|terms-and-conditions|user-guide|guides|compare|ai-question-generator|ai-test-generator|assessment-platform|auto-grading-software|bank-exam-mock-test-platform|best-online-test-platform|cbt-exam-software|chemistry-question-paper-maker|classplus-alternative|create-mock-test-online|exam-software-for-schools|hindi-online-test-maker|how-to-conduct-online-exam|jee-advanced-mock-test-software|jee-mock-test-platform|kahoot-alternative|math-test-maker|mcq-test-maker|moodle-alternative|neet-online-test-software|online-exam-software|online-proctoring-software|online-quiz-maker|online-test-for-coaching|online-test-maker|pdf-to-quiz|prevent-cheating-in-online-exams|quiz-creator|ssc-mock-test-platform|teachmint-alternative|testportal-alternative|white-label-test-platform|youtube-to-quiz|survey)(/|$)'
             THEN 'Marketing'
        ELSE 'App'
    END
$$;
