// Human title of a pill, from the authored SKILL.md body heading
// ("# Chilled-Water Leak — Technical Services Pill" → "Chilled-Water Leak").
// Falls back to the manifest slug made readable.

export function pillTitle(bundle: { name: string; skillBody?: string }): string {
  const heading = bundle.skillBody?.match(/^#\s+(.+?)\s*$/m)?.[1];
  const title = heading?.split(/\s+[—–]\s+/)[0]?.trim();
  if (title) return title;
  const s = bundle.name.replace(/[-_]+/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
