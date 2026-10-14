// Render the fixed spoken text to audio files, once.
//
//   node scripts/prerender-speech.mjs            # render what is missing
//   node scripts/prerender-speech.mjs --force    # re-render everything
//   node scripts/prerender-speech.mjs --dry-run  # list what would be rendered
//
// Writes public/speech/*.mp3 and data/speech/manifest.json. Both are committed:
// see lib/speech/manifest for why playback must not depend on a key or a quota.
//
// Needs OPENAI_API_KEY in .env.local. The voices and delivery instructions are
// read from lib/speech/tts so this script cannot drift from what the live route
// would produce for the same text.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const AUDIO_DIR = join(ROOT, 'public', 'speech');
const MANIFEST = join(ROOT, 'data', 'speech', 'manifest.json');
const TRANSCRIPT = join(ROOT, 'data', 'transcripts', 'ce-interview-2026-10-02.json');

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

/** The same voice and delivery the live route uses, read from the one source. */
function voiceTable() {
  const source = readFileSync(join(ROOT, 'lib', 'speech', 'tts.ts'), 'utf8');
  const model = source.match(/OPENAI_TTS_MODEL = '([^']+)'/)?.[1];
  const block = source.match(/const OPENAI_VOICES[\s\S]*?\n};/)?.[0];
  if (!model || !block) throw new Error('Could not read the voice table out of lib/speech/tts.ts.');
  const table = {};
  for (const m of block.matchAll(/(\w+): \{\s*voice: '([^']+)',\s*instructions:\s*([\s\S]*?),\n  \},/g)) {
    const instructions = [...m[3].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((s) => s[1]).join('');
    table[m[1]] = { voice: m[2], instructions };
  }
  if (!table.expert || !table.interviewer) throw new Error('Voice table is missing a role.');
  return { model, table };
}

/** Every piece of fixed text that is spoken, with who says it. */
function texts() {
  const transcript = JSON.parse(readFileSync(TRANSCRIPT, 'utf8'));
  const expertName = transcript.expert.name;
  const seen = new Set();
  const out = [];
  for (const turn of transcript.turns) {
    const role = turn.speaker === expertName ? 'expert' : 'interviewer';
    const text = turn.text.trim();
    const k = `${role}\u0000${text}`;
    if (seen.has(k) || !text) continue;
    seen.add(k);
    out.push({ role, text });
  }
  return out;
}

function fileFor(role, text) {
  const hash = createHash('sha256').update(`${role}\u0000${text}`).digest('hex').slice(0, 16);
  return `${role}-${hash}.mp3`;
}

const { model, table } = voiceTable();
const items = texts();
const chars = items.reduce((n, i) => n + i.text.length, 0);
console.log(`${items.length} distinct lines · ${chars.toLocaleString()} characters · model ${model}`);
console.log(`  expert -> ${table.expert.voice} · interviewer -> ${table.interviewer.voice}`);

if (dryRun) {
  for (const i of items) console.log(`  [${i.role}] ${fileFor(i.role, i.text)}  ${i.text.slice(0, 60)}…`);
  process.exit(0);
}

const key = env().OPENAI_API_KEY;
if (!key) {
  console.error('OPENAI_API_KEY is not set — nothing rendered.');
  process.exit(1);
}
mkdirSync(AUDIO_DIR, { recursive: true });

const entries = [];
let rendered = 0;
let reused = 0;

for (const [index, item] of items.entries()) {
  const name = fileFor(item.role, item.text);
  const path = join(AUDIO_DIR, name);
  const { voice, instructions } = table[item.role];

  if (!force && existsSync(path)) {
    reused++;
    entries.push({ ...item, file: `/speech/${name}`, model, voice, region: 'us', bytes: statSync(path).size });
    continue;
  }

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: item.text, voice, instructions, response_format: 'mp3' }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 120)}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < 500) throw new Error(`suspiciously small: ${buffer.byteLength} bytes`);
      writeFileSync(path, buffer);
      if (!reencode(path) && index === 0) console.warn('\n  ffmpeg not found — keeping the larger originals.');
      entries.push({ ...item, file: `/speech/${name}`, model, voice, region: 'us', bytes: statSync(path).size });
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
