import React, { useEffect } from "react";
import { LOGO } from "@ahududu/domain/logo";
import { sound } from "../lib/sound.js";

// Açılış: taneler dört bir yandan gelip ortada buluşur, taç oturur, "Ahududu" ve el yazısı slogan belirir.
// Toplam ~2,6 sn; dokununca atlanır.
const DURATION = 2600;
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Her tane logonun merkezinden dışarı doğru, kendi yönünde uzağa itilmiş yerden başlar.
const CX = 60, CY = 72;
const drops = LOGO.drops.map(([cx, cy, r], i) => {
  const ang = Math.atan2(cy - CY, cx - CX) + (i % 2 ? 0.5 : -0.5);
  const dist = 150 + (i % 3) * 40;
  return { cx, cy, r, dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, delay: i * 45 };
});

export default function Splash({ onDone }) {
  useEffect(() => {
    const total = reduced() ? 900 : DURATION;
    const chime = setTimeout(() => sound.intro(), reduced() ? 0 : 560); // taneler buluşurken
    const done = setTimeout(onDone, total);
    return () => { clearTimeout(chime); clearTimeout(done); };
  }, [onDone]);

  return (
    <div className="splash" onPointerDown={onDone} role="img" aria-label="Ahududu — alışverişin en kolay hali">
      <svg viewBox={LOGO.viewBox} className="mark" aria-hidden="true">
        <path className="crown" fill="var(--teal)" d={LOGO.crown} />
        {drops.map((d) => (
          <circle key={d.cx + "," + d.cy} className="drop" cx={d.cx} cy={d.cy} r={d.r} fill="var(--brand)"
            style={{ "--dx": d.dx + "px", "--dy": d.dy + "px", animationDelay: d.delay + "ms" }} />
        ))}
      </svg>
      <div className="word">Ahududu</div>
      <div className="hand">alışverişin en kolay hali</div>
    </div>
  );
}
