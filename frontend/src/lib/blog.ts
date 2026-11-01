/**
 * The blog is its own site, https://blog.testoza.com ("TestoZa Blog"), served by
 * the same build as testoza.com. Posts live at https://blog.testoza.com/<slug>.
 *
 * The Cloudflare worker (infrastructure/cloudflare-worker/worker.js) writes the
 * blog's HTML head for crawlers; keep the home title and description identical
 * to its BLOG_HOME_TITLE / BLOG_HOME_DESCRIPTION so nothing changes on hydration.
 */

export const BLOG_URL = 'https://blog.testoza.com';
export const BLOG_NAME = 'TestoZa Blog';
export const BLOG_HOME_TITLE = 'TestoZa Blog – Exam Tips, Teaching Guides & Product Updates';
export const BLOG_HOME_DESCRIPTION =
    'Guides for teachers and coaching institutes on creating and conducting online exams, exam preparation tips, and TestoZa product updates — from the TestoZa team.';

export const isBlogHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'blog.testoza.com' || window.location.hostname === 'news.testoza.com');

/** Canonical, shareable URL of a post. */
export const blogPostUrl = (slug: string) => `${BLOG_URL}/${encodeURIComponent(slug)}`;

/** In-app link to a post: /<slug> on the blog itself, /news/<slug> inside the app. */
export const blogPostPath = (slug: string) => (isBlogHost ? `/${slug}` : `/news/${slug}`);

/** In-app link to the list of posts. */
export const blogHomePath = isBlogHost ? '/' : '/news';
