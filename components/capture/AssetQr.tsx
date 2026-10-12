// QR code for an asset's tap-to-teach page, rendered as one SVG path.
// Encoding: uqr (MIT, unjs; a port of Nayuki's QR Code generator). Rendered on
// the server; no client JavaScript.

import { encode } from 'uqr';

/** SVG path ("M x y h1 v1 h-1 z" per dark module) for a QR matrix. */
function modulesPath(data: boolean[][], quiet: number): string {
  let d = '';
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }),
  );
  return d;
}

export function AssetQr({ url, label, className }: { url: string; label: string; className?: string }) {
  const qr = encode(url, { ecc: 'M', border: 0 });
  const quiet = 4;
  const size = qr.size + quiet * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={modulesPath(qr.data, quiet)} fill="#171717" />
    </svg>
  );
}
