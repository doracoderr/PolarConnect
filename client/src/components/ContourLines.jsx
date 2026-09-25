// Decorative topographic contour lines (glacier / ice-sheet feel).
// Paths are computed once at module load, so the output is deterministic.
const LOOPS = 11;
const POINTS = 96;
const CX = 610;
const CY = 150;

function buildLoop(i) {
  const base = 34 + i * 30;
  let d = "";
  for (let p = 0; p <= POINTS; p++) {
    const t = (p / POINTS) * Math.PI * 2;
    const wobble =
      1 + 0.1 * Math.sin(3 * t + i * 0.6) + 0.05 * Math.sin(5 * t - i * 0.9);
    const r = base * wobble;
    const x = (CX + r * 1.35 * Math.cos(t)).toFixed(1);
    const y = (CY + r * 0.85 * Math.sin(t)).toFixed(1);
    d += (p === 0 ? "M" : "L") + x + " " + y + " ";
  }
  return d + "Z";
}

const PATHS = Array.from({ length: LOOPS }, (_, i) => buildLoop(i));

export default function ContourLines({ className = "" }) {
  return (
    <svg
      className={"contour-lines " + className}
      viewBox="0 0 800 300"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth="1" opacity={0.35 + (i % 3) * 0.2} />
      ))}
    </svg>
  );
}
