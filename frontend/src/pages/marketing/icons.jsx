// Landing-page-only icon set, deliberately separate from components/ui/icons —
// these are illustrative (features/steps) rather than action icons (view/edit/delete),
// but kept in the same minimal inline-SVG stroke style as the rest of the design system.

const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.75", "aria-hidden": "true" };

export function ShieldCheckIcon({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function QrCodeIcon({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 14h3v3h-3zM20 14h1v1h-1zM14 20h1v1h-1zM17 17h1v1h-1zM20 20h1v1h-1z" />
    </svg>
  );
}

export function UsersIcon({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 19v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1" />
      <circle cx="9" cy="7" r="3.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8.5a3 3 0 010 5.5M22 19v-1a3.5 3.5 0 00-2.5-3.36" />
    </svg>
  );
}

export function ChartBarIcon({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10M12 20V4M20 20v-7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18" />
    </svg>
  );
}

export function ClipboardListIcon({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.5h6a1 1 0 011 1V6H8V4.5a1 1 0 011-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }) {
  return (
    <svg {...base} className={className} strokeWidth="2.25">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function BuildingIcon({ className = "h-5 w-5" }) {
  return (
    <svg {...base} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10h4a1 1 0 011 1v10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21h16" />
    </svg>
  );
}
