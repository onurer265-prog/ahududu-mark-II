import React from "react";
import { LOGO } from "@ahududu/domain/logo";
// Mor zeminde "ters" kullanım: berry={LOGO.colors.berryOnPurple} leaf={LOGO.colors.crownOnPurple}

export default function Logo({ size = 34, berry = "var(--brand)", leaf = "var(--teal)", label }) {
  return (
    <svg viewBox={LOGO.viewBox} width={size} height={size * 128 / 120} role={label ? "img" : undefined}
      aria-label={label} aria-hidden={label ? undefined : "true"}>
      <path fill={leaf} d={LOGO.crown} />
      <g fill={berry}>{LOGO.drops.map(([cx, cy, r]) => <circle key={cx + "," + cy} cx={cx} cy={cy} r={r} />)}</g>
    </svg>
  );
}
