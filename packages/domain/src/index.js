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

/** Ürün kaydı doğrulama — hata mesajı ya da null. */
export function validateProduct(p, products = []) {
  if (!p || typeof p !== "object") return "Geçersiz ürün";
  if (!/^\d{6,14}$/.test(String(p.barcode || ""))) return "Barkod 6–14 haneli sayı olmalı";
  if (!String(p.name || "").trim()) return "Ürün adı boş olamaz";
  if (!(Number(p.price) >= 0)) return "Fiyat 0 veya daha büyük olmalı";
  if (!(Number(p.weight) > 0)) return "Ağırlık 0'dan büyük olmalı";
  if (findProduct(products, String(p.barcode))) return "Bu barkod zaten kayıtlı";
  return null;
}
