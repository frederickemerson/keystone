import { DEMO_PERSONAS, roleLabel } from '@/lib/governance/access';

/**
 * A role id rendered as the named human behind it: "Person · Role label"
 * (persona + label from data/roles.json). Roles without a persona show the
 * label alone — never the raw snake_case id when roles.json knows it.
 */
export function PersonaName({
  role,
  className,
  nameOnly = false,
}: {
  role: string;
  className?: string;
  /** Show only the person's name; the role label stays in `title` and for screen readers. */
  nameOnly?: boolean;
}) {
  const person = DEMO_PERSONAS[role];
  const label = roleLabel(role);
  if (nameOnly && person !== undefined) {
    return (
      <span className={className} title={label}>
        <span className="font-medium">{person}</span>
        <span className="sr-only"> · {label}</span>
      </span>
    );
  }
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
