/**
 * testoza.com/jee-mock-test-platform — how JEE faculty build JEE Main and Advanced
 * mocks without learning LaTeX (AI import and the Sy Pad keyboard), how institutes
 * run them, and what students get.
 *
 * Text, metadata and structured data live in src/guides; the Cloudflare worker
 * serves the same text to crawlers, so edit the guide there, not here.
 */
import { JEE_MOCK_TEST_PLATFORM } from '@/guides/jeeMockTestPlatform';
import GuidePage from './GuidePage';
import JeeHero from './JeeHero';
import JeeWidget from './JeeWidgets';
import './jeeMockTestPlatform.css';

export default function JeeMockTestPlatform() {
    return (
        <GuidePage
            guide={JEE_MOCK_TEST_PLATFORM}
            keyPhrase="JEE mock test platform"
            hero={<JeeHero />}
            secondaryCta={{ label: 'Try the Sy Pad here', href: '#sy-pad' }}
            renderWidget={(name) => <JeeWidget name={name} />}
            className="gd-jee"
            tagline="Made in India for JEE faculty, coaching institutes and aspirants"
        />
    );
}
