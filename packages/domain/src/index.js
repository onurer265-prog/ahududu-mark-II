// Ahududu domain mantığı — kiosk, sunucu ve testler aynı kuralları kullanır.

// Katalog (reyonlar, ≈180 ürün, markalı reklamlar) ayrı dosyada.
import { AISLES } from "./catalog.js";
export { STORE_MAP, shelfOf, zonePoint, route, routeLength } from "./storemap.js";
export { AISLES, DEFAULT_PRODUCTS, DEFAULT_ADS, CATALOG_VERSION, LEGACY_AD_IDS, BARCODE_RENAMES, ean13 } from "./catalog.js";

/**
 * Araba durumu (kiosk → sunucu → panel). stage: alışveriş aşaması.
 * zone: "entry" (giriş / bekliyor), "aisle" (reyonda, aisle no ile), "exit" (ödeme / çıkış).
 */
export const CART_STAGES = {
  idle: "Bekliyor",
  shopping: "Alışverişte",
  alert: "Okutulmamış ürün",
  paying: "Ödemede",
  paid: "Ödeme tamamlandı",
};
export const CART_STALE_MS = 20000; // bu süredir haber yoksa araba "bağlantı yok"
export const LOW_BATTERY = 0.2;

/** Kiosk durumundan aşamayı çıkarır. */
export function cartStage({ screen, cartItems, verifyKind, payStage }) {
  if (payStage === "done") return "paid";
  if (payStage) return "paying";
  if (screen === "welcome" && !cartItems) return "idle";
  if (verifyKind === "bad") return "alert";
  return "shopping";
}

/** Sunucuya giden durum kaydını temizler / doğrular. Hata mesajı ya da temiz kayıt döner. */
export function cleanCartStatus(id, s) {
  if (!/^[\w-]{1,20}$/.test(String(id))) return { error: "Geçersiz araba no" };
  if (!s || !CART_STAGES[s.stage]) return { error: "Geçersiz aşama" };
  const num = (v, min, max) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : null);
  const b = s.battery;
  return {
    status: {
      id: String(id), stage: s.stage,
      items: num(s.items, 0, 999) ?? 0, total: num(s.total, 0, 1e6) ?? 0,
      verify: ["empty", "ok", "wait", "bad"].includes(s.verify) ? s.verify : "empty",
      battery: b && Number.isFinite(Number(b.level)) ? { level: num(b.level, 0, 1), charging: !!b.charging } : null,
      aisle: AISLES.some((a) => a.no === Number(s.aisle)) ? Number(s.aisle) : null,
      scale: !!s.scale,
    },
  };
}

/** Panel için: bağlantısı kopan arabaları işaretler, özet sayar. */
export function fleetSummary(carts, now = Date.now()) {
  const list = carts.map((c) => ({ ...c, stale: now - new Date(c.seen).getTime() > CART_STALE_MS }));
  const live = list.filter((c) => !c.stale);
  return {
    list,
    total: list.length,
    active: live.filter((c) => c.stage === "shopping" || c.stage === "alert" || c.stage === "paying").length,
    paying: live.filter((c) => c.stage === "paying").length,
    alerts: live.filter((c) => c.stage === "alert").length,
    lowBattery: live.filter((c) => c.battery && !c.battery.charging && c.battery.level < LOW_BATTERY).length,
    offline: list.length - live.length,
  };
}

/** Haritada nerede: "entry" | "exit" | reyon no */
export function cartZone(c) {
  if (c.stage === "paying" || c.stage === "paid") return "exit";
  if (c.stage === "idle" || !c.aisle) return "entry";
  return c.aisle;
}

/**
 * Kiosk reklamları. tone: zemin ("purple" | "green" | "cream"), place: "side" (sağ üst) | "bottom" (alt bant) | "both".
 * Yönetim panelinden düzenlenir; sunucu kapalıyken kiosk bunları gösterir.
 */
export const AD_TONES = ["purple", "green", "cream"];
export const AD_PLACES = ["both", "side", "bottom"];

/** Reklam doğrulama — hata mesajı ya da null. */
export function validateAd(a) {
  if (!a || typeof a !== "object") return "Geçersiz reklam";
  if (!String(a.brand || "").trim()) return "Marka boş olamaz";
  if (!String(a.title || "").trim()) return "Başlık boş olamaz";
  if (String(a.title).trim().length > 60) return "Başlık en fazla 60 karakter";
  if (String(a.text || "").trim().length > 120) return "Metin en fazla 120 karakter";
  if (!AD_TONES.includes(a.tone)) return "Geçersiz renk";
  if (!AD_PLACES.includes(a.place)) return "Geçersiz yer";
  return null;
}

export function cleanAd(a) {
  return {
    id: String(a.id), brand: String(a.brand).trim(), title: String(a.title).trim(), text: String(a.text || "").trim(),
    emoji: String(a.emoji || "").trim().slice(0, 8), tone: a.tone, place: a.place, active: a.active !== false,
  };
}

/** Bir reklam alanında (side | bottom) gösterilecek yayındaki reklamlar. */
export function adsFor(ads, slot) {
  return ads.filter((a) => a.active && (a.place === "both" || a.place === slot));
}

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
  if (String(p.brand || "").trim()) prod.brand = String(p.brand).trim().slice(0, 40);
  if (AISLES.some((a) => a.no === Number(p.aisle))) prod.aisle = Number(p.aisle);
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
