/**
 * testoza.com/best-online-test-platform — a long-form guide to choosing an
 * online test platform, for teachers, coaching institutes and students.
 *
 * Text, metadata and structured data live in src/guides; the Cloudflare worker
 * serves the same text to crawlers, so edit the guide there, not here.
 */
import { BEST_ONLINE_TEST_PLATFORM } from '@/guides/bestOnlineTestPlatform';
import GuidePage from './GuidePage';
import GuideWidget from './GuideWidgets';
import PhotoToTestPhone from './PhotoToTestPhone';

export default function BestOnlineTestPlatform() {
    return (
        <GuidePage
            guide={BEST_ONLINE_TEST_PLATFORM}
            keyPhrase="best online test platform"
            hero={<PhotoToTestPhone />}
            secondaryCta={{ label: 'Browse practice tests', href: '/explore' }}
            renderWidget={(name) => <GuideWidget name={name} />}
        />
    );
}
