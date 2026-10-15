// Server component — loads the exercise for a pill (authored where one exists,
// derived from the pill's own rules where it does not), the scenario drawing
// if there is one, and whether a server recogniser is usable.
//
// `?pill=` chooses which pill to teach. It exists so the generated path is
// reachable and inspectable, not just asserted: point it at a pill nobody has
// written questions for and the screen still works.

import { TeachClient } from '@/components/teach/TeachClient';
import { loadExercise } from '@/lib/teach/load';
import { teachChoices } from '@/lib/teach/choices';
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

  // Every pill the screen can teach, described. Named here rather than in the
  // catalogue because the human title comes from the pill bundle, and lib/
  // has no business importing a component module to get it.
  const choices = teachChoices().map((choice) => {
    const bundle = loadPill(choice.id);
    return { ...choice, name: bundle ? pillTitle(bundle) : choice.id };
  });

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
    // Keyed by pill: moving between pills is a client-side route change, so
    // without this React keeps the same TeachClient mounted and its state
    // survives — a screen that opened on a drawn situation stayed in the
    // scenario phase for a pill that has no drawing, and offered to move past
    // a stage list that was now empty. A key makes a different pill a
    // different component instance, which is what it is.
    <TeachClient
      key={loaded.exercise.pillId}
      exercise={loaded.exercise}
      origin={loaded.origin}
      pillName={pill ? pillTitle(pill) : pillId}
      choices={choices}
      stages={scenarioStages(loaded.exercise.scenarioId)}
      serverAsrAvailable={selectServerAsr() !== null}
    />
  );
}
