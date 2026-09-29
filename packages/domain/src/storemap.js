// Market krokisi: reyon rafları, giriş, kasa ve koridorlar. Kiosk (ürün bul + rota) ve panel (araba konumları)
// aynı geometriyi kullanır. Koordinatlar SVG birimi (viewBox 0 0 W H).
//
//  ┌──────────────────────────────────────────────┐
//  │  [1] [2] [3] [4] [5] [6]      ← üst sıra raflar
//  │ ───────────── orta koridor ─────────────────
//  │  [7] [8] [9] [10][11][12]     ← alt sıra raflar
//  │ ───────────── ön koridor ───────────────────
//  │ GİRİŞ                     [KASA][KASA][KASA]
//  └──────────────────────────────────────────────┘
// Raflar arasındaki dikey boşluklar da koridordur. Rota yalnızca koridorlardan geçer.
import { AISLES } from "./catalog.js";

const W = 1040, H = 700;
const WALL = 20;
const SHELF_W = 100, SHELF_H = 190, STEP = 150, X0 = 100;
const ROWS = [{ y: 70 }, { y: 340 }];          // üst ve alt sıra raf başlangıcı
const CORRIDORS = [300, 580];                  // yatay koridorların y'si (orta, ön)
// Dikey koridorlar: ilk raftan önceki boşluk + her rafın sağındaki boşluk
const GAPS = [(WALL + X0) / 2, ...Array.from({ length: 6 }, (_, c) => X0 + STEP * c + SHELF_W + (STEP - SHELF_W) / 2)];

const shelves = AISLES.map((a, i) => {
  const row = Math.floor(i / 6), col = i % 6;
  const x = X0 + STEP * col, y = ROWS[row].y;
  return {
    no: a.no, name: a.name, x, y, w: SHELF_W, h: SHELF_H,
    // Müşterinin durduğu yer: rafın sağındaki koridorun ortası
    stand: { x: GAPS[col + 1], y: y + SHELF_H / 2 },
  };
});

export const STORE_MAP = {
  w: W, h: H, wall: WALL,
  shelves,
  corridors: CORRIDORS,
  gaps: GAPS,
  entry: { x: GAPS[0], y: 640, label: "Giriş" },
  checkout: { x: 820, y: CORRIDORS[1], label: "Kasa", counters: [{ x: 700, y: 615, w: 70, h: 50 }, { x: 790, y: 615, w: 70, h: 50 }, { x: 880, y: 615, w: 70, h: 50 }] },
};

export function shelfOf(aisleNo) {
  return shelves.find((s) => s.no === Number(aisleNo)) || null;
}

/** Araba bölgesinin haritadaki noktası: "entry" | "exit" | reyon no */
export function zonePoint(zone) {
  if (zone === "exit") return STORE_MAP.checkout;
  if (zone === "entry" || zone == null) return STORE_MAP.entry;
  return shelfOf(zone)?.stand || STORE_MAP.entry;
}

const onGap = (x) => GAPS.some((g) => Math.abs(g - x) < 0.5);
const onCorridor = (y) => CORRIDORS.some((c) => Math.abs(c - y) < 0.5);

/**
 * İki nokta arasında koridorlardan geçen rota (köşe noktaları). Hareket dik açılı:
 * dikey koridorda yukarı/aşağı, yatay koridorda sağa/sola. En kısa yatay koridor seçilir.
 */
export function route(a, b) {
  if (a.x === b.x && a.y === b.y) return [a];
  if (Math.abs(a.x - b.x) < 0.5 && onGap(a.x)) return [a, b];                 // aynı dikey koridor
  if (Math.abs(a.y - b.y) < 0.5 && onCorridor(a.y)) return [a, b];            // aynı yatay koridor
  let best = null;
  for (const y of CORRIDORS) {
    // Dikey hareket yalnızca dikey koridorda; nokta zaten o yatay koridordaysa gerek yok
    if (Math.abs(a.y - y) > 0.5 && !onGap(a.x)) continue;
    if (Math.abs(b.y - y) > 0.5 && !onGap(b.x)) continue;
    const cost = Math.abs(a.y - y) + Math.abs(a.x - b.x) + Math.abs(b.y - y);
    if (!best || cost < best.cost) best = { y, cost };
  }
  if (!best) return [a, b];
  // Başlangıç ve hedef aynen korunur; aradaki köşelerden tekrar edenler ayıklanır
  const same = (p, q) => p.x === q.x && p.y === q.y;
  const out = [a];
  for (const p of [{ x: a.x, y: best.y }, { x: b.x, y: best.y }]) if (!same(p, out.at(-1)) && !same(p, b)) out.push(p);
  out.push(b);
  return out;
}

/** Rota uzunluğu (SVG birimi) — "yaklaşık x adım" gibi ipuçları için. */
export function routeLength(pts) {
  return pts.slice(1).reduce((s, p, i) => s + Math.abs(p.x - pts[i].x) + Math.abs(p.y - pts[i].y), 0);
}
