// Small stroke icons, drawn on a 24px grid and sized by the surrounding font.
const PATHS = {
  copy: 'M9 9h10v10H9z M5 15V5h10',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1 M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 16v4h16v-4',
  download: 'M12 4v12 M7 11l5 5 5-5 M4 20h16',
  code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5',
  expand: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5',
  contract: 'M9 4v5H4 M15 4v5h5 M9 20v-5H4 M15 20v-5h5',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16z',
  sun: 'M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10z M12 1.5v2 M12 20.5v2 M1.5 12h2 M20.5 12h2 M4.6 4.6l1.4 1.4 M18 18l1.4 1.4 M4.6 19.4L6 18 M18 6l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  system: 'M3 5h18v11H3z M8 20h8 M12 16v4',
  plus: 'M12 5v14 M5 12h14',
  x: 'M6 6l12 12 M18 6L6 18',
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, label }: { name: IconName; label?: string }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
