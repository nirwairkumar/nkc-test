/**
 * Entry point for the Cloudflare worker (infrastructure/cloudflare-worker/worker.js
 * in the root repo, which bundles this file with wrangler). It gives the worker
 * every guide with the same head data, JSON-LD and body text the React page uses.
 */
import { BEST_ONLINE_TEST_PLATFORM } from './bestOnlineTestPlatform';
import type { Guide } from './types';

export const GUIDES: Guide[] = [BEST_ONLINE_TEST_PLATFORM];

export { guideCrawlerHtml, guideJsonLd } from './render';
export { guideAssetUrl, guideUrl } from './meta';
