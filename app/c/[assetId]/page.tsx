// QR tap-to-teach (docs/capture/PLAN.md F5). A QR code on the equipment opens
// this page, which already knows the asset, its site, location and pills; the
// worker only records what is new. Behind the default-deny middleware: signing
// in is required (the route is deliberately not on the public allowlist).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Printer } from 'lucide-react';
import { PageHeader } from '@/components/mosaic/PageHeader';
import { AssetQr } from '@/components/capture/AssetQr';
import { AssetTeachClient } from '@/components/capture/AssetTeachClient';
import { humanType, requestOrigin, resolveAssetView } from './asset';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  return { title: `Teach ${decodeURIComponent(assetId)} · Keystone` };
}

export default async function AssetTeachPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const view = resolveAssetView(assetId);
  if (!view) notFound();
  const { site, equipment, pills } = view;
  const label = equipment?.id ?? site.name;
  const url = `${await requestOrigin()}/c/${encodeURIComponent(view.assetId)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <PageHeader
        eyebrow={
          <>
            <span className="font-mono">{view.assetId}</span>
            <span aria-hidden>·</span>
            <span>{site.name}</span>
          </>
        }
        title={`Teach ${label}`}
        subtitle="Tell the next person what you know about this equipment. Your note becomes a draft rule only after you check it."
      />

      <section aria-label="Asset" className="card-paper flex gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[15px] font-semibold text-heading">{equipment ? humanType(equipment.type) : humanType(site.type)}</p>
          <p className="flex items-start gap-1.5 text-sm text-ink">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              {equipment ? `${equipment.location}, ` : ''}
              {site.name} · {humanType(site.type)}
            </span>
          </p>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
            {equipment?.servesFloors ? (
              <>
                <dt className="text-ink-muted">Serves floors</dt>
                <dd>{equipment.servesFloors}</dd>
              </>
            ) : null}
            {equipment?.cmmsCode ? (
              <>
                <dt className="text-ink-muted">CMMS code</dt>
                <dd className="font-mono">{equipment.cmmsCode}</dd>
              </>
            ) : null}
            <dt className="text-ink-muted">Pills</dt>
            <dd>{pills.length ? pills.map((p) => `${p.name} v${p.version}`).join(', ') : 'No pill covers this site type'}</dd>
          </dl>
        </div>
        <Link
          href={`/c/${encodeURIComponent(view.assetId)}/qr`}
          className="flex w-24 shrink-0 flex-col items-center gap-1 self-start rounded-lg p-1 text-xs text-ink-muted hover:bg-dew-drop"
        >
          <AssetQr url={url} label={`QR code for ${label}`} className="w-full" />
          <span className="inline-flex items-center gap-1">
            <Printer aria-hidden className="size-3.5" /> Print QR
          </span>
        </Link>
      </section>

      <AssetTeachClient
        assetId={view.assetId}
        assetLabel={label}
        pills={pills.map(({ id, name, ruleIds, policy, pill }) => ({ id, name, ruleIds, policy, pill }))}
      />
    </div>
  );
}
