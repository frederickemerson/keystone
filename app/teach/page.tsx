// Server component — loads the exercise for a pill (authored where one exists,
// derived from the pill's own rules where it does not), the scenario drawing
// if there is one, and whether a server recogniser is usable.
//
// `?pill=` chooses which pill to teach. It exists so the generated path is
// reachable and inspectable, not just asserted: point it at a pill nobody has
// written questions for and the screen still works.

import { TeachClient } from '@/components/teach/TeachClient';
import { loadExercise } from '@/lib/teach/load';
import { scenarioStages } from '@/lib/teach/scenario';
import { loadPill } from '@/lib/pills/load';
import { pillTitle } from '@/components/mosaic/pillTitle';
import { selectServerAsr } from '@/lib/capture/asr';
import { routes } from '@/lib/journey/routes';
import Link from 'next/link';

// Provider availability is read per request, not baked in at build time.
export const dynamic = 'force-dynamic';

const DEFAULT_PILL_ID = 'technical-services-chilled-water-leak';

export const metadata = { title: 'Teach a skill · Keystone' };

export default async function TeachPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requested = (await searchParams).pill;
  const pillId = typeof requested === 'string' && requested.trim() ? requested.trim() : DEFAULT_PILL_ID;

  const loaded = loadExercise(pillId);
  const pill = loadPill(pillId);

  if (!loaded) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink">
          There is no exercise for “{pillId}”. Either no pill with that id loads, or its rules carry too little to
          ask about.
        </p>
        <Link href={routes.registry()} className="btn-pill text-xs">
          Browse the pills
        </Link>
      </div>
    );
  }

  return (
    <TeachClient
      exercise={loaded.exercise}
      origin={loaded.origin}
      pillName={pill ? pillTitle(pill) : pillId}
      stages={scenarioStages(loaded.exercise.scenarioId)}
      serverAsrAvailable={selectServerAsr() !== null}
    />
  );
}
