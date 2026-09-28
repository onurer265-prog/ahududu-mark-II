import React from "react";
import { LOGO } from "@ahududu/domain/logo";

export default function Logo({ size = 22, berry = LOGO.colors.berryOnPurple, leaf = LOGO.colors.crownOnPurple }) {
  return (
    <svg viewBox={LOGO.viewBox} width={size} height={size * 128 / 120} aria-hidden="true">
      <path fill={leaf} d={LOGO.crown} />
      <g fill={berry}>{LOGO.drops.map(([cx, cy, r]) => <circle key={cx + "," + cy} cx={cx} cy={cy} r={r} />)}</g>
    </svg>
  );
}
