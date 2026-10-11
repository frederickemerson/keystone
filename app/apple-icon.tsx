import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Apple touch icon: the Keystone mark on cream (same geometry as app/icon.svg). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fdfbf9',
        }}
      >
        <svg width="128" height="128" viewBox="0 0 32 32">
          <path d="M11.16 25 L9.34 14 L3.6 17.2 L7.4 27.2Z" fill="#171717" />
          <path d="M20.84 25 L22.66 14 L28.4 17.2 L24.6 27.2Z" fill="#171717" />
          <path d="M13 24 L10 6 L22 6 L19 24Z" fill="#ff6f1e" />
        </svg>
      </div>
    ),
    size,
  );
}
