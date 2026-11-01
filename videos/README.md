# videos/

All TestoZa video work lives here. The website's own MP4s stay in
`frontend/public/videos/` because the site serves them from there.

| Folder | What's in it |
|---|---|
| `projects/testoza-launch/` | 102 s launch film (v4). UI frames are server-rendered from the real app components. |
| `projects/testoza-builder-tutorial/` | 6:05 Hindi-voice test-builder tutorial (v3). YouTube files in `youtube/`. |
| `projects/testoza-pdf-short/` | 9:16 YouTube Short "PDF to live test in about 2 minutes" (in progress). |
| `projects/starter/` | The first HyperFrames starter project. Kept for reference. |
| `shared/paper-pages/` | Question-paper page images used by the films (`render.py` makes them). |
| `shared/tts-venv/` | Local Kokoro voice Python (git-ignored). Point `HYPERFRAMES_PYTHON` at `shared/tts-venv/Scripts/python.exe`. |
| `exports/` | One copy of each finished video with a clear name (git-ignored, too big for GitHub). |

Each project is a HyperFrames project: run `npm run check`, `npm run dev` and `npm run render` from inside it.
