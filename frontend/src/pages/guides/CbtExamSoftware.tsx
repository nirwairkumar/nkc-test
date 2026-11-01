/**
 * testoza.com/cbt-exam-software — what CBT exam software has to do, how to run a
 * computer-based test for a batch, and where TestoZa fits.
 *
 * Text, metadata and structured data live in src/guides; the Cloudflare worker
 * serves the same text to crawlers, so edit the guide there, not here.
 */
import { CBT_EXAM_SOFTWARE } from '@/guides/cbtExamSoftware';
import GuidePage from './GuidePage';
import CbtTablet from './CbtTablet';
import CbtWidget from './CbtWidgets';
import './cbtExamSoftware.css';

export default function CbtExamSoftware() {
    return (
        <GuidePage
            guide={CBT_EXAM_SOFTWARE}
            keyPhrase="CBT exam software"
            hero={<CbtTablet />}
            secondaryCta={{ label: 'See how to conduct an exam', href: '/user-guide/conduct-exam' }}
            renderWidget={(name) => <CbtWidget name={name} />}
            className="gd-cbt"
            tagline="Made in India for coaching institutes, schools and teachers"
        />
    );
}
