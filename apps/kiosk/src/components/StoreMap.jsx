import React from "react";
import { STORE_MAP as M, shelfOf, route } from "@ahududu/domain";

// Reyon adını raf genişliğine sığacak satırlara böler: "Kişisel Bakım" → ["Kişisel", "Bakım"], "Süt & Kahvaltılık" → ["Süt &", "Kahvaltılık"]
export const nameLines = (name) => name.split(" ").reduce((lines, w) => {
  if (w === "&") lines[lines.length - 1] += " &"; else lines.push(w);
  return lines;
}, []);

// Market krokisi (SVG). here: arabanın bulunduğu nokta, target: hedef reyon no.
// Hedef seçiliyse buradan oraya koridorlardan geçen hareketli bir çizgi çizer.
export default function StoreMap({ here, target, onShelf }) {
  const goal = target ? shelfOf(target) : null;
  const pts = goal ? route(here, goal.stand) : null;
  const path = pts ? pts.map((p, i) => (i ? "L" : "M") + p.x + " " + p.y).join(" ") : "";

  return (
    <svg className="storemap" viewBox={`0 0 ${M.w} ${M.h}`} role="img"
      aria-label={goal ? `Market krokisi: Reyon ${goal.no} ${goal.name} yolu gösteriliyor` : "Market krokisi"}>
      {/* Duvarlar ve giriş kapısı */}
      <rect className="floor" x={M.wall} y={M.wall} width={M.w - 2 * M.wall} height={M.h - 2 * M.wall} rx="14" />
      <rect className="door" x={M.entry.x - 36} y={M.h - M.wall - 4} width="72" height="8" rx="4" />
      <text className="zone-label" x={M.entry.x} y={M.h - 34} textAnchor="middle">GİRİŞ</text>

      {/* Kasalar */}
      {M.checkout.counters.map((c, i) => <rect key={i} className="counter" x={c.x} y={c.y} width={c.w} height={c.h} rx="6" />)}
      <text className="zone-label" x={M.checkout.counters[1].x + 35} y={M.checkout.counters[1].y + 32} textAnchor="middle">KASA</text>

      {/* Reyon rafları */}
      {M.shelves.map((s) => {
        const on = goal?.no === s.no;
        return (
          <g key={s.no} className={"shelf" + (on ? " on" : "")} onClick={onShelf ? () => onShelf(s.no) : undefined}
            role={onShelf ? "button" : undefined} aria-label={onShelf ? `Reyon ${s.no} ${s.name}` : undefined} tabIndex={onShelf ? 0 : undefined}
            onKeyDown={onShelf ? (e) => (e.key === "Enter" || e.key === " ") && onShelf(s.no) : undefined}>
            <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="8" />
            <text className="no" x={s.x + s.w / 2} y={s.y + 58} textAnchor="middle">{s.no}</text>
            {nameLines(s.name).map((line, i) => (
              <text key={i} className="nm" x={s.x + s.w / 2} y={s.y + 100 + i * 19} textAnchor="middle">{line}</text>
            ))}
          </g>
        );
      })}

      {/* Rota: alt çizgi + hareketli kesikli çizgi */}
      {pts && pts.length > 1 && <>
        <path className="route-bg" d={path} />
        <path className="route" d={path} key={path} />
        <circle className="goal" cx={goal.stand.x} cy={goal.stand.y} r="14" />
      </>}

      {/* Buradasınız */}
      <g className="here" transform={`translate(${here.x} ${here.y})`}>
        <circle className="pulse" r="16" />
        <circle className="dot" r="11" />
      </g>
      <text className="here-label" x={here.x} y={here.y - 22} textAnchor="middle">Buradasınız</text>
    </svg>
  );
}
