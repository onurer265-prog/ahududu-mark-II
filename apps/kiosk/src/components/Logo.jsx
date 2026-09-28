import React from "react";
// Ahududu işareti (claude.ai "Ahududu Logo" kiti): dokuz damla = sepetteki ürünler, üstte yeşil taç.
// Mor zeminde "ters" kullanım: berry="#FAF8F3", leaf="#B9FFDF".
const DROPS = [[36, 45, 12], [60, 40, 12], [84, 45, 12], [33, 69, 12], [60, 66, 12], [87, 69, 12], [47, 90, 12], [73, 90, 12], [60, 108, 11]];

export default function Logo({ size = 34, berry = "var(--brand)", leaf = "var(--teal)", label }) {
  return (
    <svg viewBox="0 0 120 128" width={size} height={size * 128 / 120} role={label ? "img" : undefined}
      aria-label={label} aria-hidden={label ? undefined : "true"}>
      <path fill={leaf} d="M40 40 L34 22 L42 30 L48 10 L53 26 L60 3 L67 26 L72 10 L78 30 L86 22 L80 40 Z" />
      <g fill={berry}>{DROPS.map(([cx, cy, r]) => <circle key={cx + "," + cy} cx={cx} cy={cy} r={r} />)}</g>
    </svg>
  );
}
