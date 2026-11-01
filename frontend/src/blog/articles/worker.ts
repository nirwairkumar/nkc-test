/**
 * Entry point for the Cloudflare worker (infrastructure/cloudflare-worker/worker.js
 * in the root repo, which bundles this file with wrangler). It gives the worker
 * every static article with the same head data, JSON-LD and body text the React
 * page uses. Newest first.
 */
import { STOP_PAINTING_WHITE_BOXES } from './stopPaintingWhiteBoxes';
import type { StaticArticle } from './types';

export const STATIC_ARTICLES: StaticArticle[] = [STOP_PAINTING_WHITE_BOXES];

export { articleCrawlerHtml, articleJsonLd, formatArticleDate } from './render';
export { staticArticleUrl, staticAssetUrl } from './meta';
