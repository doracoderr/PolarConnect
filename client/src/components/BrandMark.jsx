// Compass-rose mark used as the PolarConnect brand icon (navbar + login).
export default function BrandMark({ size = 26, className = "" }) {
  return (
    <svg
      className={"brand-mark " + className}
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="13" cy="13" r="11.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13 4.5L15.2 11.4 13 21.5 10.8 11.4 13 4.5Z" fill="currentColor" />
      <circle cx="13" cy="13" r="1.6" fill="var(--navy)" />
    </svg>
  );
}
