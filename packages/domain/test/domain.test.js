import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRODUCTS as P, addToCart, removeFromCart, expectedWeight, cartTotal,
  verifyWeight, canCheckout, validateProduct,
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
});
