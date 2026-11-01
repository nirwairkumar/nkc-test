-- Count the guide added on 25 October 2026 as a Marketing landing, not App:
--   /best-online-exam-software-india
--
-- Everything else is exactly the live definition (checked 25 October 2026; identical to
-- 20261015150000), so this is safe to run once or more than once.

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
             OR p_path ~ '^/(about|ai-question-generator|ai-test-generator|assessment-platform|auto-grading-software|bank-exam-mock-test-platform|best-online-exam-software-india|best-online-test-platform|canvas-quizzes-alternative|cbt-exam-software|chemistry-question-paper-maker|classplus-alternative|compare|create-mock-test-online|embed-test-on-website|exam-software-for-schools|full-length-online-test-maker|guides|hindi-online-test-maker|how-to-conduct-online-exam|jee-advanced-mock-test-software|jee-mock-test-platform|kahoot-alternative|math-test-maker|mcq-test-maker|mercer-mettl-alternative|mobile-friendly-online-exam|moodle-alternative|neet-online-test-software|online-exam-software|online-proctoring-software|online-quiz-maker|online-test-for-coaching|online-test-maker|pdf-to-quiz|premium|prevent-cheating-in-online-exams|pricing|privacy-policy|proprofs-alternative|quiz-creator|share-test-on-whatsapp|socrative-alternative|speedexam-alternative|ssc-mock-test-platform|support|survey|teachmint-alternative|terms-and-conditions|testportal-alternative|user-guide|white-label-test-platform|youtube-to-quiz)(/|$)'
             THEN 'Marketing'
        ELSE 'App'
    END
$$;
