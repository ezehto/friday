const DOTS = [[8, 12], [11, 12], [14, 12], [92, 86], [89, 86], [86, 86], [93, 20], [93, 23]] as const;

/** Static decoration only: carries no information. */
export function Background() {
  return (
    <svg className="bg-art" aria-hidden="true" focusable="false" width="100%" height="100%">
      <defs>
        <pattern id="bg-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" className="bg-grid-line" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-grid)" />
      <g className="bg-blueprint">
        <line x1="0" y1="30%" x2="100%" y2="30%" />
        <line x1="0" y1="72%" x2="100%" y2="72%" />
        <line x1="22%" y1="0" x2="22%" y2="100%" />
        <line x1="78%" y1="0" x2="78%" y2="100%" />
      </g>
      <g className="bg-dots">
        {DOTS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={`${x}%`} cy={`${y}%`} r="2" />
        ))}
      </g>
      <g className="bg-corners">
        <path d="M16 56V16H56" />
        <svg x="100%" overflow="visible"><path d="M-16 56V16H-56" /></svg>
        <svg y="100%" overflow="visible"><path d="M16 -56V-16H56" /></svg>
        <svg x="100%" y="100%" overflow="visible"><path d="M-16 -56V-16H-56" /></svg>
      </g>
    </svg>
  );
}
