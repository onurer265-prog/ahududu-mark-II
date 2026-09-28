// Ahududu domain mantığı — kiosk, sunucu ve testler aynı kuralları kullanır.

/** Demo ürün kataloğu (Mark I kiosk'undaki raf ile aynı). weight: gram, emoji: raf görseli */
export const DEFAULT_PRODUCTS = [
  { barcode: "8690001000012", name: "Süt (1L)", price: 34.5, weight: 1030, emoji: "🥛" },
  { barcode: "8690001000029", name: "Ekmek", price: 12, weight: 350, emoji: "🍞" },
  { barcode: "8690001000036", name: "Yumurta (10'lu)", price: 68, weight: 620, emoji: "🥚" },
  { barcode: "8690001000043", name: "Domates (kg)", price: 28.9, weight: 1000, emoji: "🍅" },
  { barcode: "8690001000050", name: "Makarna (500g)", price: 22.5, weight: 500, emoji: "🍝" },
  { barcode: "8690001000067", name: "Zeytinyağı (1L)", price: 189, weight: 920, emoji: "🫒" },
  { barcode: "8690001000074", name: "Elma (kg)", price: 24.9, weight: 1000, emoji: "🍎" },
  { barcode: "8690001000081", name: "Peynir (500g)", price: 145, weight: 505, emoji: "🧀" },
];

/** Ağırlık toleransı: en az 25 g ya da beklenenin %3'ü. */
export const MIN_TOLERANCE_G = 25;
export const TOLERANCE_RATIO = 0.03;

export function findProduct(products, barcode) {
  return products.find((p) => p.barcode === barcode) || null;
}

/** Sepet: [{ barcode, qty }] — değiştirmeden yeni dizi döner. */
export function addToCart(cart, barcode) {
  const existing = cart.find((i) => i.barcode === barcode);
  if (existing) return cart.map((i) => (i.barcode === barcode ? { ...i, qty: i.qty + 1 } : i));
  return [...cart, { barcode, qty: 1 }];
}

export function removeFromCart(cart, barcode) {
  return cart
    .map((i) => (i.barcode === barcode ? { ...i, qty: i.qty - 1 } : i))
    .filter((i) => i.qty > 0);
}

export function expectedWeight(cart, products) {
  return cart.reduce((sum, i) => sum + i.qty * (findProduct(products, i.barcode)?.weight || 0), 0);
}

export function cartTotal(cart, products) {
  const t = cart.reduce((sum, i) => sum + i.qty * (findProduct(products, i.barcode)?.price || 0), 0);
  return Math.round(t * 100) / 100;
}

export function tolerance(expected) {
  return Math.max(MIN_TOLERANCE_G, expected * TOLERANCE_RATIO);
}

/**
 * Ölçülen ağırlığı sepetle karşılaştırır.
 * kind: "empty" | "ok" | "wait" (eksik ağırlık) | "bad" (okutulmamış ürün / fazla ağırlık)
 */
export function verifyWeight(cart, products, measured) {
  const expected = expectedWeight(cart, products);
  const tol = tolerance(expected);
  const diff = measured - expected;
  if (!cart.length && Math.abs(diff) <= tol) return { kind: "empty", expected, measured, diff, tol };
  if (Math.abs(diff) <= tol) return { kind: "ok", expected, measured, diff, tol };
  if (diff < 0) return { kind: "wait", expected, measured, diff, tol };
  return { kind: "bad", expected, measured, diff, tol };
}

export function canCheckout(cart, products, measured) {
  return cart.length > 0 && verifyWeight(cart, products, measured).kind === "ok";
}

/** Ürün kaydı doğrulama — hata mesajı ya da null. update: mevcut ürünü düzenlerken barkod çakışmasını sayma. */
export function validateProduct(p, products = [], { update = false } = {}) {
  if (!p || typeof p !== "object") return "Geçersiz ürün";
  if (!/^\d{6,14}$/.test(String(p.barcode || ""))) return "Barkod 6–14 haneli sayı olmalı";
  if (!String(p.name || "").trim()) return "Ürün adı boş olamaz";
  if (!(Number(p.price) >= 0)) return "Fiyat 0 veya daha büyük olmalı";
  if (!(Number(p.weight) > 0)) return "Ağırlık 0'dan büyük olmalı";
  const exists = findProduct(products, String(p.barcode));
  if (!update && exists) return "Bu barkod zaten kayıtlı";
  if (update && !exists) return "Ürün bulunamadı";
  return null;
}

/** Sunucuya kaydedilecek ürün alanları (barcode, name, price, weight, isteğe bağlı emoji). */
export function cleanProduct(p) {
  const prod = { barcode: String(p.barcode), name: String(p.name).trim(), price: Number(p.price), weight: Number(p.weight) };
  if (p.emoji) prod.emoji = String(p.emoji).trim().slice(0, 8);
  return prod;
}

/**
 * Yönetim paneli özeti. sales: [{ time, total, items:[{barcode,name,qty,price}] }]
 * since: bu andan (dahil) sonraki satışlar; verilmezse hepsi.
 */
export function salesSummary(sales, since = null) {
  const list = since ? sales.filter((s) => new Date(s.time) >= since) : sales;
  const revenue = Math.round(list.reduce((a, s) => a + s.total, 0) * 100) / 100;
  const items = list.reduce((a, s) => a + s.items.reduce((b, i) => b + i.qty, 0), 0);
  const byProduct = new Map();
  for (const s of list) for (const i of s.items) {
    const r = byProduct.get(i.barcode) || { barcode: i.barcode, name: i.name, qty: 0, revenue: 0 };
    r.qty += i.qty; r.revenue = Math.round((r.revenue + i.qty * i.price) * 100) / 100;
    byProduct.set(i.barcode, r);
  }
  const top = [...byProduct.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
  return { count: list.length, revenue, items, avg: list.length ? Math.round((revenue / list.length) * 100) / 100 : 0, top, sales: list };
}

/** Satışları yerel saate göre kovalara böler: unit "hour" (0–23) ya da "day" (son n gün, eskiden yeniye). */
export function bucketSales(sales, unit, now = new Date(), days = 7) {
  if (unit === "hour") {
    const b = Array.from({ length: 24 }, (_, h) => ({ key: h, total: 0, count: 0 }));
    for (const s of sales) { const h = new Date(s.time).getHours(); b[h].total += s.total; b[h].count++; }
    return b.map((x) => ({ ...x, total: Math.round(x.total * 100) / 100 }));
  }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const b = Array.from({ length: days }, (_, i) => ({ key: new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), total: 0, count: 0 }));
  for (const s of sales) {
    const t = new Date(s.time);
    const i = Math.floor((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - start) / 864e5);
    if (i >= 0 && i < days) { b[i].total += s.total; b[i].count++; }
  }
  return b.map((x) => ({ ...x, total: Math.round(x.total * 100) / 100 }));
}
