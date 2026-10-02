/**
 * Entry point for the Cloudflare worker (infrastructure/cloudflare-worker/worker.js
 * in the root repo, which bundles this file with wrangler). It gives the worker
 * every guide with the same head data, JSON-LD and body text the React page uses.
 */
import { AI_TEST_GENERATOR } from './aiTestGenerator';
import { BEST_ONLINE_TEST_PLATFORM } from './bestOnlineTestPlatform';
import { CBT_EXAM_SOFTWARE } from './cbtExamSoftware';
import { JEE_MOCK_TEST_PLATFORM } from './jeeMockTestPlatform';
import { MOODLE_ALTERNATIVE } from './moodleAlternative';
import { NEET_ONLINE_TEST_SOFTWARE } from './neetOnlineTestSoftware';
import type { Guide } from './types';

export const GUIDES: Guide[] = [MOODLE_ALTERNATIVE, NEET_ONLINE_TEST_SOFTWARE, AI_TEST_GENERATOR, JEE_MOCK_TEST_PLATFORM, CBT_EXAM_SOFTWARE, BEST_ONLINE_TEST_PLATFORM];

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
