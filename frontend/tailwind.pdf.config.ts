import type { Config } from 'tailwindcss';
import base from './tailwind.config';

/** pdf.testoza.com only scans its own code, so its CSS stays small. */
export default {
    ...base,
    content: ['./pdf.html', './src/pdf/**/*.{ts,tsx}', './src/components/ui/{dialog,dropdown-menu,sonner}.tsx'],
} satisfies Config;
