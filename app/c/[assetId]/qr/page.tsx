// Printable QR label for one asset's tap-to-teach page. The label carries the
// asset id in text too, so it stays useful if the code cannot be scanned.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AssetQr } from '@/components/capture/AssetQr';
import { PrintButton } from '@/components/capture/PrintButton';
import { humanType, requestOrigin, resolveAssetView } from '../asset';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  return { title: `QR label ${decodeURIComponent(assetId)} · Keystone` };
}

// Print only the label (the app shell stays on screen, not on paper).
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .qr-label, .qr-label * { visibility: visible !important; }
  .qr-label { position: absolute; left: 0; top: 0; box-shadow: none !important; }
}`;

export default async function AssetQrPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const view = resolveAssetView(assetId);
  if (!view) notFound();
  const label = view.equipment?.id ?? view.site.name;
  const url = `${await requestOrigin()}/c/${encodeURIComponent(view.assetId)}`;

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-16">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>QR label for {label}</h1>
        <div className="flex gap-2">
          <Link href={`/c/${encodeURIComponent(view.assetId)}`} className="btn-pill min-h-11">
            Back to asset
          </Link>
          <PrintButton />
        </div>
      </div>
      <figure className="qr-label card-paper mx-auto w-[18rem] space-y-3 bg-white p-6 text-center">
        <AssetQr url={url} label={`QR code linking to ${url}`} className="mx-auto w-full" />
        <figcaption className="space-y-1">
          <p className="font-mono text-xl font-semibold text-charcoal">{label}</p>
          <p className="text-sm text-charcoal">
            {view.equipment ? `${view.equipment.location} · ` : ''}
            {view.site.name}
          </p>
          <p className="text-sm text-charcoal">{view.equipment ? humanType(view.equipment.type) : humanType(view.site.type)}</p>
          <p className="pt-1 text-xs text-charcoal">Scan to teach Keystone about this equipment. Sign-in required.</p>
        </figcaption>
      </figure>
      <p className="break-all text-center font-mono text-xs text-ink-muted">{url}</p>
    </div>
  );
}
