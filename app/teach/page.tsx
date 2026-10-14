// Server component — loads the authored exercise and the pill it teaches, and
// reads (on the server, no secrets) whether a server recogniser is usable so
// the client knows which dictation engine to offer.

import { TeachClient } from '@/components/teach/TeachClient';
import { loadExercise } from '@/lib/teach/load';
import { loadPill } from '@/lib/pills/load';
import { pillTitle } from '@/components/mosaic/pillTitle';
import { selectServerAsr } from '@/lib/capture/asr';

// Provider availability is read per request, not baked in at build time.
export const dynamic = 'force-dynamic';

const PILL_ID = 'technical-services-chilled-water-leak';

export const metadata = { title: 'Teach a skill · Keystone' };

export default function TeachPage() {
  const exercise = loadExercise(PILL_ID);
  const pill = loadPill(PILL_ID);

  if (!exercise) {
    return (
      <p className="text-sm text-ink-muted">
        No exercise is authored for “{PILL_ID}” in data/teach.
      </p>
    );
  }

  return (
    <TeachClient
      exercise={exercise}
      pillName={pill ? pillTitle(pill) : PILL_ID}
      serverAsrAvailable={selectServerAsr() !== null}
    />
  );
}
