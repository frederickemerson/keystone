import { DEMO_PERSONAS, roleLabel } from '@/lib/governance/access';

/**
 * A role id rendered as the named human behind it: "Person · Role label"
 * (persona + label from data/roles.json). Roles without a persona show the
 * label alone — never the raw snake_case id when roles.json knows it.
 */
export function PersonaName({ role, className }: { role: string; className?: string }) {
  const person = DEMO_PERSONAS[role];
  const label = roleLabel(role);
  return (
    <span className={className}>
      {person !== undefined ? (
        <>
          <span className="font-medium">{person}</span>
          <span className="text-ink-muted"> · {label}</span>
        </>
      ) : (
        label
      )}
    </span>
  );
}
