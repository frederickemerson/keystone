// Teaching a skill: the chooser first, a session behind it.
//
// Why the screen is split. For most of its life this route opened straight
// into the chilled-water leak, which made the honest reading of the demo
// "this is a chilled-water app". That leak is one case. What the screen does
// is teach any pill whose rules carry enough to ask about — so that is what
// it opens on, and a session is something you choose.
//
// `?pill=` is therefore not a developer's escape hatch any more; it is the
// address of a session. Without it there is nothing to resume and nothing to
// assume, so the screen asks instead of picking for you.

import { TeachClient } from '@/components/teach/TeachClient';
import { TeachChooser } from '@/components/teach/TeachChooser';
import { PageHeader } from '@/components/mosaic';
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

export const metadata = { title: 'Teach a skill · Keystone' };

export default async function TeachPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requested = (await searchParams).pill;
  const pillId = typeof requested === 'string' && requested.trim() ? requested.trim() : null;

  if (!pillId) {
    // Every pill the screen can teach, described. Named here rather than in
    // the catalogue because the human title comes from the pill bundle, and
    // lib/ has no business importing a component module to get it.
    const choices = teachChoices().map((choice) => {
      const bundle = loadPill(choice.id);
      return { ...choice, name: bundle ? pillTitle(bundle) : choice.id };
    });

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={<span>Teach a skill</span>}
          title="What would you like to teach today?"
          subtitle="Each one opens the same way: the situation first where somebody has drawn one, then one wide question, then only what that answer left open. A session ends in a draft rule for whoever may edit that pill — never in a change."
        />
        <TeachChooser choices={choices} />
      </div>
    );
  }

  const loaded = loadExercise(pillId);
  const pill = loadPill(pillId);

  if (!loaded) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink">
          There is no exercise for “{pillId}”. Either no pill with that id loads, or its rules carry too little to
          ask about.
        </p>
        <Link href={routes.teach()} className="btn-pill text-xs">
          Choose a skill
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
      stages={scenarioStages(loaded.exercise.scenarioId)}
      serverAsrAvailable={selectServerAsr() !== null}
    />
  );
}
