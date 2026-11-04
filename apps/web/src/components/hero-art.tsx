/** Decorative hero illustration: a laptop and an RGB tower, drawn in SVG (no external images). */
export function HeroArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 360" className={className} role="img" aria-label="Laptop and gaming PC illustration">
      <defs>
        <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset=".45" stopColor="#7c3aed" />
          <stop offset=".75" stopColor="#db2777" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#334155" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity=".55" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset=".5" stopColor="#a855f7" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <ellipse cx="300" cy="200" rx="260" ry="150" fill="url(#glow)" />
      {/* tower */}
      <rect x="360" y="40" width="150" height="270" rx="10" fill="url(#body)" stroke="#475569" />
      <rect x="372" y="54" width="126" height="242" rx="6" fill="#0b1224" stroke="#1e293b" />
      {[100, 170, 240].map((cy) => (
        <g key={cy}>
          <circle cx="435" cy={cy} r="28" fill="none" stroke="url(#ring)" strokeWidth="5" />
          <circle cx="435" cy={cy} r="12" fill="#0f172a" stroke="#334155" />
        </g>
      ))}
      {/* laptop */}
      <g transform="translate(40 80)">
        <rect x="40" y="0" width="300" height="190" rx="12" fill="#1f2937" stroke="#475569" />
        <rect x="52" y="12" width="276" height="166" rx="6" fill="url(#scr)" />
        <path d="M52 140 C120 90 190 160 328 70 L328 178 L52 178 Z" fill="#0ea5e9" opacity=".25" />
        <path d="M0 196 h380 l-18 22 H18 Z" fill="url(#body)" stroke="#475569" />
        <rect x="160" y="198" width="60" height="5" rx="2.5" fill="#64748b" />
      </g>
      {/* headphones */}
      <g transform="translate(290 270)" opacity=".9">
        <path d="M0 40 a34 34 0 0 1 68 0" fill="none" stroke="#334155" strokeWidth="7" />
        <rect x="-6" y="34" width="16" height="26" rx="6" fill="#1e293b" stroke="#22d3ee" />
        <rect x="58" y="34" width="16" height="26" rx="6" fill="#1e293b" stroke="#ec4899" />
      </g>
    </svg>
  );
}
