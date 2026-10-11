'use client';

// Inline text whose visibility depends on the acting role. Server components
// cannot know the role (it lives in the client governance store), so they
// render sensitive values through this: SSR and the first client render use
// the unresolved role (masked), then the acting role's clearance applies.

import { useMounted } from '@/components/mosaic/useMounted';
import { redactText, UNRESOLVED_ROLE } from '@/lib/governance/access';
import { useGovernanceStore } from '@/lib/governance/store';
import type { SensitivityLevel } from '@/lib/data/schemas';

export function RoleRedacted({ text, sensitivity }: { text: string; sensitivity: SensitivityLevel }) {
  const mounted = useMounted();
  const role = useGovernanceStore((s) => s.currentActor.role);
  return <>{redactText(text, mounted ? role : UNRESOLVED_ROLE, sensitivity)}</>;
}
