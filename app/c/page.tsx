// Equipment index: every site and piece of equipment in the asset register,
// with its tap-to-teach page and printable QR label. Only operational fields
// are shown (no tenant or client data), so nothing here needs role scoping.

import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { PageHeader } from '@/components/mosaic/PageHeader';
import { SectionHeader } from '@/components/mosaic/SectionHeader';
import { pillTitle } from '@/components/mosaic/pillTitle';
import { assetTypeLabel } from '@/components/incident/labels';
import { loadAssets } from '@/lib/data';
import { routes } from '@/lib/journey/routes';
import { loadAllPills } from '@/lib/pills/load';

export const metadata = { title: 'Equipment · Keystone' };

/** Equipment classes are written like "Air_Handling_Unit"; sites like "grade_a_office". */
function typeLabel(type: string): string {
  return assetTypeLabel(type.toLowerCase());
}

const TH = 'py-2 pr-3 text-left text-[12px] font-medium text-ink-muted';
const TD = 'py-2 pr-3 align-top text-[13px] text-ink';

export default function EquipmentIndexPage() {
  const sites = loadAssets();
  const pills = loadAllPills();

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-16">
      <PageHeader
        title="Equipment"
        subtitle="Every site and piece of equipment in the asset register. Open one to teach the next person what you know about it, or print its QR label for the plant room."
      />
      {sites.map((site) => {
        const covering = pills.filter((b) => b.pill.manifest.scope.asset_types?.includes(site.type));
        return (
          <section key={site.id} aria-label={site.name} className="space-y-3">
            <SectionHeader
              title={site.name}
              description={`${typeLabel(site.type)} · ${
                covering.length ? `Pills: ${covering.map((b) => pillTitle(b)).join(', ')}` : 'No pill covers this site type yet'
              }`}
              actions={
                <Link href={routes.asset(site.id)} className="btn-pill text-xs">
                  Teach this site
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    <th className={TH}>Equipment</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Location</th>
                    <th className={TH}>CMMS code</th>
                    <th className={TH}>
                      <span className="sr-only">Links</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {site.equipment.map((eq) => (
                    <tr key={eq.id} className="border-b border-line/60">
                      <td className={TD}>
                        <Link href={routes.asset(eq.id)} className="font-mono font-medium underline-offset-2 hover:underline">
                          {eq.id}
                        </Link>
                      </td>
                      <td className={TD}>
                        {typeLabel(eq.type)}
                        <span className="block font-mono text-[11px] text-ink-muted">{eq.brick_class}</span>
                      </td>
                      <td className={TD}>{eq.location}</td>
                      <td className={`${TD} font-mono`}>{eq.cmms_asset_code}</td>
                      <td className={`${TD} whitespace-nowrap text-right`}>
                        <Link href={routes.asset(eq.id)} className="mr-3 underline-offset-2 hover:underline">
                          Teach
                        </Link>
                        <Link href={`${routes.asset(eq.id)}/qr`} className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                          <QrCode aria-hidden className="size-3.5" /> QR label
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
