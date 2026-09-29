import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRODUCTS as P, addToCart, removeFromCart, expectedWeight, cartTotal,
  verifyWeight, canCheckout, validateProduct, cleanProduct, salesSummary, bucketSales,
  DEFAULT_ADS, validateAd, cleanAd, adsFor,
  cartStage, cleanCartStatus, fleetSummary, cartZone, AISLES, ean13, BARCODE_RENAMES,
  STORE_MAP, shelfOf, zonePoint, route, routeLength,
} from "../src/index.js";

const SUT = P[0].barcode, CIK = P[1].barcode, ELMA = P[6].barcode; // Süt 1030 g / 34,50 ₺ · Ekmek 350 g / 12 ₺ · Elma 24,90 ₺

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
  assert.equal(cartTotal([{ barcode: SUT, qty: 1 }, { barcode: CIK, qty: 1 }, { barcode: ELMA, qty: 1 }], P), 71.4);
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

test("araba aşaması, durum kaydı ve filo özeti", () => {
  assert.equal(cartStage({ screen: "welcome", cartItems: 0 }), "idle");
  assert.equal(cartStage({ screen: "shop", cartItems: 0, verifyKind: "empty" }), "shopping");
  assert.equal(cartStage({ screen: "shop", cartItems: 2, verifyKind: "bad" }), "alert");
  assert.equal(cartStage({ screen: "shop", cartItems: 2, payStage: "choose" }), "paying");
  assert.equal(cartStage({ screen: "shop", cartItems: 0, payStage: "done" }), "paid");

  assert.equal(cleanCartStatus("0417", { stage: "uçuyor" }).error, "Geçersiz aşama");
  assert.equal(cleanCartStatus("../x", { stage: "idle" }).error, "Geçersiz araba no");
  const { status } = cleanCartStatus("0417", { stage: "shopping", items: 3, total: 71.4, verify: "ok", battery: { level: 1.7, charging: 1 }, aisle: 42, scale: true, extra: "x" });
  assert.deepEqual(status, { id: "0417", stage: "shopping", items: 3, total: 71.4, verify: "ok", battery: { level: 1, charging: true }, aisle: null, scale: true });
  assert.equal(cleanCartStatus("0418", { stage: "idle", battery: null }).status.battery, null);

  const now = Date.parse("2026-09-28T12:00:30Z");
  const seen = (s) => new Date(now - s * 1000).toISOString();
  const f = fleetSummary([
    { id: "1", stage: "shopping", seen: seen(2), battery: { level: 0.1, charging: false }, aisle: 3 },
    { id: "2", stage: "alert", seen: seen(5), battery: { level: 0.1, charging: true } },
    { id: "3", stage: "paying", seen: seen(1), battery: null },
    { id: "4", stage: "shopping", seen: seen(60), battery: { level: 0.05, charging: false } }, // bağlantı yok
    { id: "5", stage: "idle", seen: seen(3), battery: { level: 0.9, charging: false } },
  ], now);
  assert.deepEqual([f.total, f.active, f.paying, f.alerts, f.lowBattery, f.offline], [5, 3, 1, 1, 1, 1]);
  assert.equal(f.list[3].stale, true);
  assert.deepEqual(f.list.map(cartZone), [3, "entry", "exit", "entry", "entry"]);
  assert.equal(cleanProduct({ barcode: "123456", name: "x", price: 1, weight: 1, aisle: "3" }).aisle, 3);
  assert.equal(cleanProduct({ barcode: "123456", name: "x", price: 1, weight: 1, aisle: 42 }).aisle, undefined);
});

test("katalog: barkodlar, ürünler, reyonlar, reklamlar", () => {
  assert.ok(P.length > 150);
  const codes = P.map((p) => p.barcode);
  assert.equal(new Set(codes).size, codes.length, "barkodlar benzersiz");
  // Bütün barkodlar geçerli EAN-13 ve mağaza içi "20" önekli (gerçek ürünlerle çakışmaz)
  for (const c of codes) { assert.equal(ean13(c.slice(0, 12)), c, "geçerli EAN-13: " + c); assert.match(c, /^20\d{11}$/); }
  // Mark I'in eski barkodları yeni barkodlara eşleniyor
  assert.equal(Object.keys(BARCODE_RENAMES).length, 8);
  assert.equal(BARCODE_RENAMES["8690001000012"], SUT);
  assert.notEqual(ean13("869000100001"), "8690001000012"); // eski barkodun kontrol hanesi gerçekten geçersizdi
  for (const p of P) assert.equal(validateProduct(p), null, p.name);
  for (const a of AISLES) assert.ok(P.some((p) => p.aisle === a.no), "reyon boş değil: " + a.name);
  assert.ok(P.every((p) => AISLES.some((a) => a.no === p.aisle)));
  assert.equal(ean13("400638133393"), "4006381333931"); // bilinen gerçek EAN-13 örneği
  assert.equal(P[0].barcode, SUT);                      // Mark I ürünleri korunur
  const brands = new Set(P.map((p) => p.brand).filter(Boolean));
  for (const ad of DEFAULT_ADS) assert.ok(brands.has(ad.brand), "reklam markası katalogda: " + ad.brand);
  assert.equal(new Set(DEFAULT_ADS.map((a) => a.id)).size, DEFAULT_ADS.length);
});

test("market krokisi ve rota", () => {
  const M = STORE_MAP;
  assert.equal(M.shelves.length, AISLES.length);
  // Raflar birbirine ve duvarlara çakışmaz
  for (const s of M.shelves) {
    assert.ok(s.x > M.wall && s.x + s.w < M.w - M.wall && s.y > M.wall && s.y + s.h < M.h - M.wall, "raf içeride: " + s.name);
    for (const t of M.shelves) if (t !== s) assert.ok(s.x + s.w <= t.x || t.x + t.w <= s.x || s.y + s.h <= t.y || t.y + t.h <= s.y);
  }
  // Bir doğru parçası rafın içinden geçiyor mu (kenara değmek serbest)
  const cuts = (p, q, s) => {
    const [x1, x2] = [Math.min(p.x, q.x), Math.max(p.x, q.x)], [y1, y2] = [Math.min(p.y, q.y), Math.max(p.y, q.y)];
    return x1 < s.x + s.w && x2 > s.x && y1 < s.y + s.h && y2 > s.y;
  };
  const check = (a, b, label) => {
    const pts = route(a, b);
    assert.deepEqual(pts[0], a, label); assert.deepEqual(pts.at(-1), b, label);
    for (let i = 1; i < pts.length; i++) {
      const [p, q] = [pts[i - 1], pts[i]];
      assert.ok(p.x === q.x || p.y === q.y, "dik açılı: " + label);
      for (const s of M.shelves) assert.ok(!cuts(p, q, s), `${label} rotası ${s.name} rafının içinden geçiyor`);
    }
    return pts;
  };
  const points = [M.entry, M.checkout, ...M.shelves.map((s) => s.stand)];
  for (const a of points) for (const b of points) check(a, b, `${a.x},${a.y}→${b.x},${b.y}`);
  // Girişten 1. reyona: önce yukarı, sonra sağa, sonra yukarı (en fazla 4 köşe)
  const r = route(M.entry, shelfOf(1).stand);
  assert.ok(r.length <= 4);
  assert.ok(routeLength(r) > 0);
  assert.deepEqual(zonePoint("entry"), M.entry);
  assert.deepEqual(zonePoint("exit"), M.checkout);
  assert.deepEqual(zonePoint(7), shelfOf(7).stand);
  assert.equal(shelfOf(99), null);
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
