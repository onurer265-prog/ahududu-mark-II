import React from "react";
import { STORE_MAP as M, CART_STAGES, cartZone, zonePoint } from "@ahududu/domain";

// Panel krokisi: kiosk'taki "Ürün bul" krokisinin aynısı (ortak geometri @ahududu/domain STORE_MAP);
// üzerinde her araba bulunduğu yerde, aşamasının rengiyle bir işaret.
const nameLines = (name) => name.split(" ").reduce((l, w) => { if (w === "&") l[l.length - 1] += " &"; else l.push(w); return l; }, []);
const stateOf = (c) => (c.stale ? "stale" : c.stage);

export default function StoreMap({ carts }) {
  // Aynı noktadaki arabalar üst üste binmesin: küçük bir ızgarada yan yana dizilir
  const byZone = new Map();
  for (const c of carts) {
    const z = String(cartZone(c));
    byZone.set(z, [...(byZone.get(z) || []), c]);
  }
  const marks = [];
  for (const [z, list] of byZone) {
    const base = zonePoint(isNaN(Number(z)) ? z : Number(z));
    list.forEach((c, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      marks.push({ c, x: base.x + (col - (Math.min(list.length, 3) - 1) / 2) * 58, y: base.y + row * 40 });
    });
  }
  const occupied = new Set(carts.filter((c) => !c.stale).map((c) => cartZone(c)));

  return (
    <svg className="storemap" viewBox={`0 0 ${M.w} ${M.h}`} role="img" aria-label={`Market krokisi, ${carts.length} araba`}>
      <rect className="floor" x={M.wall} y={M.wall} width={M.w - 2 * M.wall} height={M.h - 2 * M.wall} rx="14" />
      <rect className="door" x={M.entry.x - 36} y={M.h - M.wall - 4} width="72" height="8" rx="4" />
      <text className="zone-label" x={M.entry.x} y={M.h - 34} textAnchor="middle">GİRİŞ</text>
      {M.checkout.counters.map((c, i) => <rect key={i} className="counter" x={c.x} y={c.y} width={c.w} height={c.h} rx="6" />)}
      <text className="zone-label" x={M.checkout.counters[1].x + 35} y={M.checkout.counters[1].y + 32} textAnchor="middle">KASA</text>
      {M.shelves.map((s) => (
        <g key={s.no} className={"shelf" + (occupied.has(s.no) ? " busy" : "")}>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="8" />
          <text className="no" x={s.x + s.w / 2} y={s.y + 58} textAnchor="middle">{s.no}</text>
          {nameLines(s.name).map((line, i) => <text key={i} className="nm" x={s.x + s.w / 2} y={s.y + 100 + i * 19} textAnchor="middle">{line}</text>)}
        </g>
      ))}
      {marks.map(({ c, x, y }) => (
        <g key={c.id} className={"cartmark st-" + stateOf(c)} transform={`translate(${x} ${y})`}>
          <title>{`#${c.id} · ${c.stale ? "Bağlantı yok" : CART_STAGES[c.stage]} · ${c.items} ürün`}</title>
          {c.stage === "alert" && !c.stale && <circle className="ring" r="30" />}
          <rect x="-27" y="-15" width="54" height="30" rx="15" />
          <text textAnchor="middle" y="5">{c.id}</text>
        </g>
      ))}
    </svg>
  );
}
