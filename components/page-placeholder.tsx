export function PagePlaceholder({ title, purpose }: { title: string; purpose: string }) {
  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-[13px] font-medium text-ink-muted">Keystone</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{purpose}</p>
      <div className="mt-6 rounded-lg border border-dashed border-line bg-surface p-6 text-sm text-ink-muted">
        Placeholder — the app shell is scaffolded; this screen is built next.
      </div>
    </section>
  );
}
