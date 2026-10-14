// Render the fixed spoken text to audio files, once.
//
//   node scripts/prerender-speech.mjs            # render what is missing
//   node scripts/prerender-speech.mjs --force    # re-render everything
//   node scripts/prerender-speech.mjs --dry-run  # list what would be rendered
//
// Writes public/speech/*.mp3 and data/speech/manifest.json. Both are committed:
// see lib/speech/manifest for why playback must not depend on a key or a quota.
//
// Uses the same provider chain the live route does: TokenHub
// (minimax-speech-2.8-hd) first, OpenAI (gpt-4o-mini-tts) as the fallback. The
// model ids and voices are read out of lib/speech/tts, so this script cannot
// drift from what the route would produce for the same text — and the manifest
// records which provider actually spoke each line.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const AUDIO_DIR = join(ROOT, 'public', 'speech');
const MANIFEST = join(ROOT, 'data', 'speech', 'manifest.json');
const TRANSCRIPT = join(ROOT, 'data', 'transcripts', 'ce-interview-2026-10-02.json');
const EXERCISE = join(ROOT, 'data', 'teach', 'chilled-water-leak.json');
const SCENARIO = join(ROOT, 'data', 'teach', 'scenario.json');

const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

/**
 * The API returns mono 24 kHz mp3 at 128 kbit/s, which is 2.7x the bitrate
 * 24 kHz speech can carry — the first run came to 19.9 MB for 56 lines, and
 * these files are committed. Re-encoding to 48 kbit/s mono gives 7.4 MB with
 * no audible difference through a laptop speaker, and costs no API call.
 * Without ffmpeg the originals are kept rather than failing the run.
 */
const SPEECH_BITRATE = '48k';

function reencode(path) {
  try {
    const temp = `${path}.tmp.mp3`;
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', path, '-codec:a', 'libmp3lame',
      '-b:a', SPEECH_BITRATE, '-ac', '1', '-ar', '24000', temp], { stdio: 'pipe' });
    execFileSync('mv', [temp, path]);
    return true;
  } catch {
    return false;
  }
}

function env() {
  const path = join(ROOT, '.env.local');
  if (!existsSync(path)) return process.env;
  const parsed = Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      }),
  );
  return { ...parsed, ...process.env };
}

/** The same models and voices the live route uses, read from the one source. */
function providerConfig() {
  const source = readFileSync(join(ROOT, 'lib', 'speech', 'tts.ts'), 'utf8');
  const openaiModel = source.match(/OPENAI_TTS_MODEL = '([^']+)'/)?.[1];
  const tokenhubModel = source.match(/TOKENHUB_SPEECH_MODEL = '([^']+)'/)?.[1];
  const tokenhubPath = source.match(/TOKENHUB_TTS_PATH = '([^']+)'/)?.[1];
  const tokenhubRegion = source.match(/TOKENHUB_TTS_REGION = '([^']+)'/)?.[1];

  const openaiBlock = source.match(/const OPENAI_VOICES[\s\S]*?\n\};/)?.[0];
  const openai = {};
  for (const m of (openaiBlock ?? '').matchAll(/(\w+): \{\s*voice: '([^']+)',\s*instructions:\s*([\s\S]*?),\n  \},/g)) {
    openai[m[1]] = { voice: m[2], instructions: [...m[3].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]).join('') };
  }

  const thBlock = source.match(/const TOKENHUB_VOICES[\s\S]*?\n\};/)?.[0];
  const tokenhub = {};
  for (const m of (thBlock ?? '').matchAll(/(\w+): '([^']+)'/g)) tokenhub[m[1]] = m[2];

  if (!openaiModel || !tokenhubModel || !tokenhubPath || !openai.expert || !tokenhub.expert) {
    throw new Error('Could not read the provider config out of lib/speech/tts.ts.');
  }
  return { openaiModel, tokenhubModel, tokenhubPath, tokenhubRegion, openai, tokenhub };
}

/**
 * Every piece of fixed text that is spoken, with who says it:
 *
 *   - the recorded call's 56 turns (/capture), and
 *   - the exercise's scenario captions and question prompts (/teach).
 *
 * The second group is why this list is not just the transcript. The first run
 * covered only the transcript, so every line /teach speaks went to the live
 * route instead — and a walk through the exercise hit 429 after six lines,
 * because the live budget is ten calls a minute. Fixed text belongs here.
 */
function texts() {
  const seen = new Set();
  const out = [];
  const add = (role, raw) => {
    const text = (raw ?? '').trim();
    const k = `${role}\u0000${text}`;
    if (!text || seen.has(k)) return;
    seen.add(k);
    out.push({ role, text });
  };

  const transcript = JSON.parse(readFileSync(TRANSCRIPT, 'utf8'));
  for (const turn of transcript.turns) {
    add(turn.speaker === transcript.expert.name ? 'expert' : 'interviewer', turn.text);
  }

  // Scenario captions, from the same file the app renders.
  for (const stage of JSON.parse(readFileSync(SCENARIO, 'utf8')).stages) {
    add('interviewer', stage.caption);
  }

  // The exercise asks the questions, so the interviewer speaks them.
  const exercise = JSON.parse(readFileSync(EXERCISE, 'utf8'));
  for (const question of [exercise.opening, ...exercise.questions]) {
    add('interviewer', question.given);
    add('interviewer', question.prompt);
  }

  return out;
}

/**
 * The filename carries the MODEL as well as the words. Without it, switching
 * provider reuses every file already on disk and the manifest claims a voice
 * nobody rendered — the whole corpus would keep the old provider's audio while
 * saying it came from the new one.
 */
function fileFor(role, text, modelId) {
  const hash = createHash('sha256').update(`${role}\u0000${modelId}\u0000${text}`).digest('hex').slice(0, 16);
  return `${role}-${hash}.mp3`;
}

const config = providerConfig();
const items = texts();
const chars = items.reduce((n, i) => n + i.text.length, 0);
const keys = env();
const useTokenhub = Boolean(keys.TOKENHUB_API_KEY) && !process.argv.includes('--openai');
const model = useTokenhub ? config.tokenhubModel : config.openaiModel;
const voices = useTokenhub ? config.tokenhub : { expert: config.openai.expert.voice, interviewer: config.openai.interviewer.voice };
console.log(`${items.length} distinct lines · ${chars.toLocaleString()} characters · model ${model}`);
console.log(`  expert -> ${voices.expert} · interviewer -> ${voices.interviewer}`);

if (dryRun) {
  for (const i of items) console.log(`  [${i.role}] ${fileFor(i.role, i.text, model)}  ${i.text.slice(0, 60)}…`);
  process.exit(0);
}

const key = useTokenhub ? keys.TOKENHUB_API_KEY : keys.OPENAI_API_KEY;
if (!key) {
  console.error(`${useTokenhub ? 'TOKENHUB_API_KEY' : 'OPENAI_API_KEY'} is not set — nothing rendered.`);
  process.exit(1);
}
const base = (keys.TOKENHUB_BASE_URL || 'https://tokenhub-intl.tencentcloudmaas.com/v1').replace(/\/$/, '');

/** One line of audio, from whichever provider is in use. Throws on anything unusable. */
async function speak(text, role) {
  if (!useTokenhub) {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text, voice: voices[role], instructions: config.openai[role].instructions, response_format: 'mp3' }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
    return Buffer.from(await r.arrayBuffer());
  }
  const r = await fetch(`${base}/${config.tokenhubPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, text,
      voice_setting: { voice_id: voices[role], speed: 1, vol: 1, pitch: 0 },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
      subtitle_enable: false, output_format: 'hex',
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
  const j = await r.json();
  // A 200 carrying a non-zero status_code is a refusal, not a success.
  if (j?.base_resp?.status_code !== 0) throw new Error(`refused: ${j?.base_resp?.status_msg ?? 'unknown'}`);
  const hex = j?.data?.audio;
  if (!hex || !/^[0-9a-f]+$/i.test(hex) || hex.length < 200) throw new Error('no audio in the answer');
  return Buffer.from(hex, 'hex');
}
mkdirSync(AUDIO_DIR, { recursive: true });

/** Recorded on every entry, so the UI can say where the audio was made. */
const region = useTokenhub ? (config.tokenhubRegion ?? 'tokenhub-intl') : 'us';

const entries = [];
let rendered = 0;
let reused = 0;

for (const [index, item] of items.entries()) {
  const name = fileFor(item.role, item.text, model);
  const path = join(AUDIO_DIR, name);

  if (!force && existsSync(path)) {
    reused++;
    entries.push({ ...item, file: `/speech/${name}`, model, voice: voices[item.role], region, bytes: statSync(path).size });
    continue;
  }

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const buffer = await speak(item.text, item.role);
      if (buffer.byteLength < 500) throw new Error(`suspiciously small: ${buffer.byteLength} bytes`);
      writeFileSync(path, buffer);
      if (!reencode(path) && index === 0) console.warn('\n  ffmpeg not found — keeping the larger originals.');
      entries.push({ ...item, file: `/speech/${name}`, model, voice: voices[item.role], region, bytes: statSync(path).size });
      rendered++;
      process.stdout.write(`\r  rendered ${rendered} / reused ${reused} (${index + 1}/${items.length})   `);
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  if (lastError) {
    console.error(`\n  FAILED [${item.role}] ${item.text.slice(0, 60)}… — ${lastError.message}`);
    process.exitCode = 1;
  }
}

entries.sort((a, b) => a.file.localeCompare(b.file));
writeFileSync(
  MANIFEST,
  `${JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), entries }, null, 2)}\n`,
);
const total = entries.reduce((n, e) => n + e.bytes, 0);
console.log(
  `\n${entries.length} entries · ${(total / 1_000_000).toFixed(2)} MB · rendered ${rendered}, reused ${reused}`,
);
