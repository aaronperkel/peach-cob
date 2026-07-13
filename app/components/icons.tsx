// Small inline SVG icons (replaces the Font Awesome CDN used by the PHP site).

export function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function EnvelopeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

/** The house mark: a little peach with a leaf, drawn in brand colors. */
export function PeachMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* fruit: two soft lobes */}
      <path
        d="M12 8.2 C8.6 5.6 3.4 7.6 3.4 12.6 C3.4 17.4 7.4 21 12 21 C16.6 21 20.6 17.4 20.6 12.6 C20.6 7.6 15.4 5.6 12 8.2 Z"
        fill="var(--stripe-a)"
        stroke="var(--ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* cleft */}
      <path
        d="M12 8.4 C11.2 11.2 11.2 15.4 12.6 18.6"
        stroke="var(--ink)"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.55"
        fill="none"
      />
      {/* stem */}
      <path
        d="M12 8 C12 6.2 12.8 4.8 14.2 3.8"
        stroke="var(--ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* leaf */}
      <path
        d="M14.2 3.8 C16.4 3 18.4 3.6 19.4 5 C17.8 6.4 15.4 6.4 13.8 5.4 C13.8 4.8 14 4.2 14.2 3.8 Z"
        fill="var(--paid)"
        stroke="var(--ink)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}
