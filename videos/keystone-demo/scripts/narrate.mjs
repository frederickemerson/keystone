// Narration for the film: one clip per beat-group, so the edit can sit on the
// beats rather than guessing where they fall inside a long take.
//
// Same voice path the product itself uses — MiniMax Speech 2.8 HD through
// Tencent TokenHub — so the film and the thing it is about sound like one
// piece of work. The narrator is a THIRD voice, distinct from the two the
// product speaks in, or the film would sound like the product narrating itself.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'assets/audio');
const force = process.argv.includes('--force');

/** Swap this one constant to change the narrator. */
const NARRATOR_VOICE = process.env.NARRATOR_VOICE || 'English_expressive_narrator';
const MODEL = 'minimax-speech-2.8-hd';
/** Slightly up: the script is directed "upbeat, fast cuts". */
const SPEED = 1.05;

const env = Object.fromEntries(
  readFileSync('/Users/frederick/Documents/Projects/acdi/.env.local', 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const base = (env.TOKENHUB_BASE_URL || 'https://tokenhub-intl.tencentcloudmaas.com/v1').replace(/\/$/, '');

async function speak(text) {
  const r = await fetch(`${base}/wand/minimax-tts/sync_tts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.TOKENHUB_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, text,
      voice_setting: { voice_id: NARRATOR_VOICE, speed: SPEED, vol: 1, pitch: 0 },
      audio_setting: { sample_rate: 44100, bitrate: 128000, format: 'mp3', channel: 1 },
      subtitle_enable: false, output_format: 'hex',
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
  const j = await r.json();
  if (j?.base_resp?.status_code !== 0) throw new Error(`refused: ${j?.base_resp?.status_msg}`);
  const hex = j?.data?.audio;
  if (!hex || !/^[0-9a-f]+$/i.test(hex) || hex.length < 200) throw new Error('no audio');
  return { buf: Buffer.from(hex, 'hex'), ms: j.extra_info?.audio_length ?? null };
}

/** Measured, not taken from the API's own figure. */
function durationSec(path) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]);
  return Number(String(out).trim());
}

const script = JSON.parse(readFileSync(join(ROOT, 'script.json'), 'utf8'));
const manifest = [];
let made = 0, reused = 0;

for (const act of script.acts) {
  for (const [i, text] of act.groups.entries()) {
    const name = `${act.id}-${String(i).padStart(2, '0')}.mp3`;
    const path = join(OUT, name);
    if (!force && existsSync(path) && statSync(path).size > 1000) {
      reused++;
    } else {
      let last;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try { const { buf } = await speak(text); writeFileSync(path, buf); last = undefined; made++; break; }
        catch (e) { last = e; await new Promise((r) => setTimeout(r, attempt * 1500)); }
      }
      if (last) { console.error(`FAILED ${name}: ${last.message}`); process.exitCode = 1; continue; }
    }
    manifest.push({ act: act.id, index: i, file: `assets/audio/${name}`, text, seconds: durationSec(path) });
    process.stdout.write(`\r  ${made} made / ${reused} reused   `);
  }
}

const byAct = {};
for (const m of manifest) (byAct[m.act] ??= []).push(m);
const actTotals = Object.fromEntries(
  Object.entries(byAct).map(([id, rows]) => [id, Number(rows.reduce((n, r) => n + r.seconds, 0).toFixed(2))]),
);
writeFileSync(join(ROOT, 'narration.json'), JSON.stringify({ voice: NARRATOR_VOICE, model: MODEL, speed: SPEED, clips: manifest, actTotals }, null, 2) + '\n');

const total = manifest.reduce((n, m) => n + m.seconds, 0);
console.log(`\n${manifest.length} clips · voice ${NARRATOR_VOICE} · speech ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}`);
for (const [id, secs] of Object.entries(actTotals)) console.log(`  ${id.padEnd(8)} ${secs}s`);
