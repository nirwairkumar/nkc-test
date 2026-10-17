// Runs the shared HyperFrames audio engine with Hindi switched on.
// product-launch-video's audio.mjs has no --lang flag, so point HF_MEDIA_ENGINE here.
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.argv.push('--lang', 'hi');
const engine = path.join(os.homedir(), '.claude/skills/media-use/audio/scripts/audio.mjs');
await import(pathToFileURL(engine).href);
