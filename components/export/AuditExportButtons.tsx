'use client';

// "Download CSV" / "Download JSON" for the append-only audit log.

import { Download } from 'lucide-react';
import type { AuditLog } from '@/lib/governance/audit';
import { auditFileStem, auditToCsv, auditToJson } from '@/lib/export/audit-export';
import { downloadFile } from '@/lib/export/download';

type Props = {
  log: AuditLog;
};

export function AuditExportButtons({ log }: Props) {
  const empty = log.length === 0;

  function handleCsv() {
    downloadFile(`${auditFileStem(new Date().toISOString())}.csv`, auditToCsv(log), 'text/csv;charset=utf-8');
  }

  function handleJson() {
    const at = new Date().toISOString();
    downloadFile(`${auditFileStem(at)}.json`, auditToJson(log, at), 'application/json');
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Export the audit log">
      <button type="button" className="btn-pill text-xs" onClick={handleCsv} disabled={empty}>
        <Download className="size-3.5" aria-hidden="true" />
        Download CSV
      </button>
      <button type="button" className="btn-pill text-xs" onClick={handleJson} disabled={empty}>
        <Download className="size-3.5" aria-hidden="true" />
        Download JSON
      </button>
    </div>
  );
}
