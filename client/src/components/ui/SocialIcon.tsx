import type { ReactNode } from 'react';

// Own inline SVGs (no icon library), 16 px and decorative: the link text names the platform.
// All are drawn on a 16x16 grid with currentColor, so they follow the button's text color.

const filled = (path: string) => <path d={path} fill="currentColor" />;

const icons: Record<string, ReactNode> = {
  github: filled(
    'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z',
  ),
  linkedin: (
    <>
      <rect
        x="0.75"
        y="0.75"
        width="14.5"
        height="14.5"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="4.75" cy="4.75" r="1" fill="currentColor" />
      <path
        d="M4.75 7v4.5M7.75 11.5V7m0 2a1.75 1.75 0 0 1 3.5 0v2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  x: (
    <path
      d="M2 2l12 12M14 2L2 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  ),
  instagram: (
    <>
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="4" r="0.9" fill="currentColor" />
    </>
  ),
  youtube: (
    <>
      <rect
        x="0.75"
        y="2.75"
        width="14.5"
        height="10.5"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M6.5 5.5v5L10.5 8z" fill="currentColor" />
    </>
  ),
  gitlab: filled('M8 14.6 1 9.5l.8-2.6L3.5 1.4l1.9 5.5h5.2l1.9-5.5 1.7 5.5.8 2.6z'),
};

// Unknown platforms get a plain link glyph.
const generic = (
  <path
    d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  />
);

export const hasOwnIcon = (platform: string) => Object.hasOwn(icons, platform.toLowerCase());

export function SocialIcon({ platform }: { platform: string }) {
  const key = platform.toLowerCase();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      data-icon={hasOwnIcon(key) ? key : 'generic'}
    >
      {hasOwnIcon(key) ? icons[key] : generic}
    </svg>
  );
}
