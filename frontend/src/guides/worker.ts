/**
 * Entry point for the Cloudflare worker (infrastructure/cloudflare-worker/worker.js
 * in the root repo, which bundles this file with wrangler). It gives the worker
 * every guide with the same head data, JSON-LD and body text the React page uses.
 */
import { AI_TEST_GENERATOR } from './aiTestGenerator';
import { BEST_ONLINE_TEST_PLATFORM } from './bestOnlineTestPlatform';
import { CBT_EXAM_SOFTWARE } from './cbtExamSoftware';
import { CONDUCT_ONLINE_EXAM } from './conductOnlineExam';
import { HINDI_ONLINE_TEST_MAKER } from './hindiOnlineTestMaker';
import { JEE_MOCK_TEST_PLATFORM } from './jeeMockTestPlatform';
import { MOODLE_ALTERNATIVE } from './moodleAlternative';
import { NEET_ONLINE_TEST_SOFTWARE } from './neetOnlineTestSoftware';
import { PREVENT_CHEATING_ONLINE_EXAMS } from './preventCheatingOnlineExams';
import { MATH_TEST_MAKER } from './mathTestMaker';
import { CHEMISTRY_QUESTION_PAPER_MAKER } from './chemistryQuestionPaperMaker';
import { JEE_ADVANCED_MOCK_TEST_SOFTWARE } from './jeeAdvancedMockTestSoftware';
import { SSC_MOCK_TEST_PLATFORM } from './sscMockTestPlatform';
import { BANK_EXAM_MOCK_TEST_PLATFORM } from './bankExamMockTestPlatform';
import { CLASSPLUS_ALTERNATIVE } from './classplusAlternative';
import { TEACHMINT_ALTERNATIVE } from './teachmintAlternative';
import { KAHOOT_ALTERNATIVE } from './kahootAlternative';
import { TESTPORTAL_ALTERNATIVE } from './testportalAlternative';
import { METTL_ALTERNATIVE } from './mettlAlternative';
import { PROPROFS_ALTERNATIVE } from './proprofsAlternative';
import { SOCRATIVE_ALTERNATIVE } from './socrativeAlternative';
import { SPEEDEXAM_ALTERNATIVE } from './speedexamAlternative';
import { CANVAS_QUIZZES_ALTERNATIVE } from './canvasQuizzesAlternative';
import { MOBILE_FRIENDLY_ONLINE_EXAM } from './mobileFriendlyOnlineExam';
import { EMBED_TEST_ON_WEBSITE } from './embedTestOnWebsite';
import { FULL_LENGTH_ONLINE_TEST_MAKER } from './fullLengthOnlineTestMaker';
import { SHARE_TEST_ON_WHATSAPP } from './shareTestOnWhatsapp';
import { BEST_ONLINE_EXAM_SOFTWARE_INDIA } from './bestOnlineExamSoftwareIndia';
import type { Guide } from './types';

export const GUIDES: Guide[] = [BEST_ONLINE_EXAM_SOFTWARE_INDIA, METTL_ALTERNATIVE, PROPROFS_ALTERNATIVE, SOCRATIVE_ALTERNATIVE, SPEEDEXAM_ALTERNATIVE, CANVAS_QUIZZES_ALTERNATIVE, MOBILE_FRIENDLY_ONLINE_EXAM, EMBED_TEST_ON_WEBSITE, FULL_LENGTH_ONLINE_TEST_MAKER, SHARE_TEST_ON_WHATSAPP, CLASSPLUS_ALTERNATIVE, TEACHMINT_ALTERNATIVE, KAHOOT_ALTERNATIVE, TESTPORTAL_ALTERNATIVE, BANK_EXAM_MOCK_TEST_PLATFORM, SSC_MOCK_TEST_PLATFORM, JEE_ADVANCED_MOCK_TEST_SOFTWARE, CHEMISTRY_QUESTION_PAPER_MAKER, MATH_TEST_MAKER,PREVENT_CHEATING_ONLINE_EXAMS, HINDI_ONLINE_TEST_MAKER, CONDUCT_ONLINE_EXAM, MOODLE_ALTERNATIVE,NEET_ONLINE_TEST_SOFTWARE, AI_TEST_GENERATOR, JEE_MOCK_TEST_PLATFORM, CBT_EXAM_SOFTWARE, BEST_ONLINE_TEST_PLATFORM];

export { guideCrawlerHtml, guideJsonLd } from './render';
export { guideAssetUrl, guideUrl } from './meta';

// testoza.com/create-mock-test-online has its own content model (src/guides/mock-test);
// the worker serves it with these, alongside GUIDES above.
import { CREATE_MOCK_TEST_ONLINE } from './mock-test/createMockTestOnline';
import type { Guide as MockTestGuide } from './mock-test/types';

export const MOCK_TEST_GUIDES: MockTestGuide[] = [CREATE_MOCK_TEST_ONLINE];

export {
    guideAssetUrl as mockGuideAssetUrl,
    guideCrawlerHtml as mockGuideCrawlerHtml,
    guideJsonLd as mockGuideJsonLd,
    guideUrl as mockGuideUrl,
} from './mock-test/render';
