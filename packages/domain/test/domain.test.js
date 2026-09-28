import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRODUCTS as P, addToCart, removeFromCart, expectedWeight, cartTotal,
  verifyWeight, canCheckout, validateProduct, cleanProduct, salesSummary, bucketSales,
  DEFAULT_ADS, validateAd, cleanAd, adsFor,
} from "../src/index.js";

const SUT = "8690001000012", CIK = "8690001000029"; // Süt 1030 g / 34,50 ₺ · Ekmek 350 g / 12 ₺

test("sepete ekle / azalt", () => {
  let c = addToCart([], SUT);
  c = addToCart(c, SUT);
  c = addToCart(c, CIK);
  assert.deepEqual(c, [{ barcode: SUT, qty: 2 }, { barcode: CIK, qty: 1 }]);
  c = removeFromCart(c, CIK);
  assert.deepEqual(c, [{ barcode: SUT, qty: 2 }]);
});

test("beklenen ağırlık ve toplam", () => {
  const c = [{ barcode: SUT, qty: 2 }, { barcode: CIK, qty: 1 }];
  assert.equal(expectedWeight(c, P), 2410);
  assert.equal(cartTotal(c, P), 81);
  // Mark I videosundaki sepet: Süt + Ekmek + Elma = 71,40 ₺
  assert.equal(cartTotal([{ barcode: SUT, qty: 1 }, { barcode: CIK, qty: 1 }, { barcode: "8690001000074", qty: 1 }], P), 71.4);
});

test("ağırlık doğrulama durumları", () => {
  const c = [{ barcode: SUT, qty: 1 }];
  assert.equal(verifyWeight([], P, 0).kind, "empty");
  assert.equal(verifyWeight(c, P, 0).kind, "wait");
  assert.equal(verifyWeight(c, P, 1040).kind, "ok");
  assert.equal(verifyWeight(c, P, 1600).kind, "bad");
  assert.equal(verifyWeight([], P, 500).kind, "bad");
});

test("ödeme yalnızca ağırlık doğruysa açılır", () => {
  const c = [{ barcode: SUT, qty: 1 }];
  assert.equal(canCheckout(c, P, 1030), true);
  assert.equal(canCheckout(c, P, 0), false);
  assert.equal(canCheckout([], P, 0), false);
});

test("ürün doğrulama", () => {
  assert.equal(validateProduct({ barcode: "123", name: "x", price: 1, weight: 1 }), "Barkod 6–14 haneli sayı olmalı");
  assert.equal(validateProduct({ barcode: SUT, name: "x", price: 1, weight: 1 }, P), "Bu barkod zaten kayıtlı");
  assert.equal(validateProduct({ barcode: "8690009999999", name: "Ekmek", price: 15, weight: 250 }, P), null);
  // düzenleme: mevcut barkod geçerli, olmayan barkod hata
  assert.equal(validateProduct({ barcode: SUT, name: "Süt", price: 36, weight: 1030 }, P, { update: true }), null);
  assert.equal(validateProduct({ barcode: "8690009999999", name: "x", price: 1, weight: 1 }, P, { update: true }), "Ürün bulunamadı");
  assert.deepEqual(cleanProduct({ barcode: 123456, name: " Ayran ", price: "9.5", weight: "210", emoji: "🥛", extra: 1 }),
    { barcode: "123456", name: "Ayran", price: 9.5, weight: 210, emoji: "🥛" });
});

const sale = (time, items) => ({ time, total: items.reduce((a, i) => a + i.qty * i.price, 0), items });
const SALES = [
  sale("2026-09-28T09:15:00", [{ barcode: SUT, name: "Süt", qty: 2, price: 34.5 }]),
  sale("2026-09-28T09:40:00", [{ barcode: CIK, name: "Ekmek", qty: 1, price: 12 }, { barcode: SUT, name: "Süt", qty: 1, price: 34.5 }]),
  sale("2026-09-26T18:05:00", [{ barcode: CIK, name: "Ekmek", qty: 3, price: 12 }]),
];

test("satış özeti", () => {
  const all = salesSummary(SALES);
  assert.equal(all.count, 3);
  assert.equal(all.revenue, 151.5); // 69 + 46,5 + 36
  assert.equal(all.items, 7);
  assert.equal(all.avg, 50.5);
  assert.deepEqual(all.top.map((t) => [t.name, t.qty, t.revenue]), [["Ekmek", 4, 48], ["Süt", 3, 103.5]]);
  const today = salesSummary(SALES, new Date("2026-09-28T00:00:00"));
  assert.equal(today.count, 2);
  assert.equal(today.revenue, 115.5);
  assert.equal(salesSummary([]).avg, 0);
});

test("reklam doğrulama ve alanlar", () => {
  const ok = { id: "x", brand: "Marka", title: "Başlık", text: "", tone: "green", place: "side" };
  assert.equal(validateAd(ok), null);
  assert.equal(validateAd({ ...ok, brand: " " }), "Marka boş olamaz");
  assert.equal(validateAd({ ...ok, title: "x".repeat(61) }), "Başlık en fazla 60 karakter");
  assert.equal(validateAd({ ...ok, tone: "red" }), "Geçersiz renk");
  assert.equal(validateAd({ ...ok, place: "top" }), "Geçersiz yer");
  assert.equal(cleanAd({ ...ok, brand: " M ", extra: 1 }).brand, "M");
  assert.equal(cleanAd(ok).active, true);
  const ads = [{ ...ok, id: "a", place: "both", active: true }, { ...ok, id: "b", place: "side", active: true },
    { ...ok, id: "c", place: "bottom", active: true }, { ...ok, id: "d", place: "both", active: false }];
  assert.deepEqual(adsFor(ads, "side").map((a) => a.id), ["a", "b"]);
  assert.deepEqual(adsFor(ads, "bottom").map((a) => a.id), ["a", "c"]);
  for (const a of DEFAULT_ADS) assert.equal(validateAd(a), null);
});

test("saatlik ve günlük kovalar", () => {
  const h = bucketSales(SALES.slice(0, 2), "hour");
  assert.equal(h.length, 24);
  assert.equal(h[9].total, 115.5);
  assert.equal(h[9].count, 2);
  const d = bucketSales(SALES, "day", new Date("2026-09-28T20:00:00"), 7);
  assert.equal(d.length, 7);
  assert.equal(d[6].total, 115.5); // bugün
  assert.equal(d[4].total, 36);    // 26 Eylül
  assert.equal(d[0].total, 0);
});
