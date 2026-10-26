// Gemini TTS via models/{model}:generateContent (the key blocks the interactions API).
// Usage: node gemini-gc-tts.mjs <request.json> <projectDir> [model] [onlyIds,comma]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const [reqPath, projDir, modelArg, onlyArg] = process.argv.slice(2);
const req = JSON.parse(readFileSync(reqPath, "utf8"));
const model = modelArg || "gemini-2.5-pro-preview-tts";
const only = onlyArg ? new Set(onlyArg.split(",")) : null;
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("GEMINI_API_KEY not set");
const outDir = join(projDir, req.out_dir || "assets/voice");
mkdirSync(outDir, { recursive: true });

for (const line of req.lines) {
  if (only && !only.has(line.id)) continue;
  const direction = [req.style, line.style].filter(Boolean).join(" ");
  const language = req.lang === "en" ? "English" : "Hindi";
  const prompt = `${direction}\nRead this aloud exactly, in ${language}, and say nothing else:\n${line.text}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: line.voice || req.voice } } },
    },
  };
  let data;
  for (let attempt = 1; attempt <= 3; attempt++) {
    // AIza keys → Gemini Developer API; anything else (AQ. keys) → Vertex AI express mode, like backend/app/routers/ai.py.
    const url = key.startsWith("AIza")
      ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      : `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`;
    const res = await fetch(
      url,
      { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body) },
    );
    const json = await res.json();
    data = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (data) break;
    console.error(`✗ ${line.id} attempt ${attempt}: HTTP ${res.status} ${JSON.stringify(json.error ?? json).slice(0, 300)}`);
    if (res.status === 403 || res.status === 400) process.exit(1);
  }
  if (!data) process.exit(1);
  const rate = Number(/rate=(\d+)/.exec(data.mimeType)?.[1] ?? 24000);
  const pcm = join(outDir, `${line.id}.pcm`);
  const wav = join(outDir, `${line.id}.wav`);
  writeFileSync(pcm, Buffer.from(data.data, "base64"));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "s16le", "-ar", String(rate), "-ac", "1", "-i", pcm, "-ar", "44100", wav]);
  execFileSync(process.platform === "win32" ? "cmd" : "rm", process.platform === "win32" ? ["/c", "del", pcm.replace(/\//g, "\\")] : [pcm]);
  const dur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]).toString().trim();
  console.log(`✓ ${line.id} ${Number(dur).toFixed(2)}s → ${wav}`);
}
