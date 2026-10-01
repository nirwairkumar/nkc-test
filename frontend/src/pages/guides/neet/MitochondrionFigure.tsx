import { MITOCHONDRION_LABELS } from '@/guides/neetMiniMock';

/** Inner-membrane folds: [left x, the edge they grow from]. */
const TOP_FOLDS = [104, 140, 176];
const BOTTOM_FOLDS = [122, 158];
const GRANULES: [number, number][] = [
    [72, 70], [84, 104], [96, 86], [132, 104], [150, 92], [168, 108], [204, 72], [214, 110], [226, 88], [196, 98],
];

/**
 * A textbook-style line drawing of a mitochondrion for question 5 of the NEET
 * mini-mock: P outer membrane, Q a crista, R matrix, S the space between the
 * membranes. In a real test this would be an uploaded or AI-cropped image.
 */
export default function MitochondrionFigure() {
    return (
        <svg viewBox="0 0 320 170" width="320" height="170" role="img" aria-label={`Diagram of a mitochondrion: ${MITOCHONDRION_LABELS}`} style={{ display: 'block', maxWidth: '100%', height: 'auto' }}>
            <rect width="320" height="170" fill="#fff" />
            <g fill="none" stroke="#111" strokeLinecap="round" strokeLinejoin="round">
                <rect x="40" y="30" width="210" height="110" rx="55" strokeWidth="2" fill="#fff" />
                <rect x="52" y="42" width="186" height="86" rx="43" strokeWidth="1.6" fill="#f0f0ee" />
                {TOP_FOLDS.map((x) => (
                    <g key={`t${x}`}>
                        <path d={`M${x} 42 V71 A5 5 0 0 0 ${x + 10} 71 V42`} strokeWidth="1.6" fill="#fff" />
                        <path d={`M${x + 1} 42 H${x + 9}`} stroke="#fff" strokeWidth="3" />
                    </g>
                ))}
                {BOTTOM_FOLDS.map((x) => (
                    <g key={`b${x}`}>
                        <path d={`M${x} 128 V99 A5 5 0 0 1 ${x + 10} 99 V128`} strokeWidth="1.6" fill="#fff" />
                        <path d={`M${x + 1} 128 H${x + 9}`} stroke="#fff" strokeWidth="3" />
                    </g>
                ))}
            </g>
            <g fill="#555">
                {GRANULES.map(([cx, cy]) => (
                    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.7" />
                ))}
            </g>
            <g stroke="#111" strokeWidth="1">
                <path d="M24 85 H40" />
                <path d="M125 19 V36" />
                <path d="M264 26 L187 58" />
                <path d="M288 96 H218" />
            </g>
            <g fill="#111" fontFamily="'Times New Roman', Georgia, serif" fontSize="15" fontWeight="700">
                <text x="10" y="90">P</text>
                <text x="120" y="15">S</text>
                <text x="266" y="27">Q</text>
                <text x="292" y="101">R</text>
            </g>
        </svg>
    );
}
