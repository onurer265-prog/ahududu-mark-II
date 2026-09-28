import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { createStore } from "../src/store.js";

async function withServer(fn) {
  const srv = createApp(createStore(null)).listen(0);
  await new Promise((r) => srv.once("listening", r));
  const base = `http://127.0.0.1:${srv.address().port}/api`;
  try { await fn(base); } finally { srv.close(); }
}

test("ürün listesi ve ekleme", () => withServer(async (b) => {
  const list = await (await fetch(b + "/products")).json();
  assert.equal(list.length, 8);
  const bad = await fetch(b + "/products", { method: "POST", body: JSON.stringify({ barcode: "1" }) });
  assert.equal(bad.status, 400);
  const ok = await fetch(b + "/products", { method: "POST", body: JSON.stringify({ barcode: "8690009999999", name: "Ekmek", price: 15, weight: 250 }) });
  assert.equal(ok.status, 201);
}));

test("ödeme ağırlık doğrulamasına bağlı", () => withServer(async (b) => {
  const cart = [{ barcode: "8690001000012", qty: 1 }];
  const rej = await fetch(b + "/checkout", { method: "POST", body: JSON.stringify({ cart, measured: 0 }) });
  assert.equal(rej.status, 409);
  const acc = await fetch(b + "/checkout", { method: "POST", body: JSON.stringify({ cart, measured: 1035, method: "POS" }) });
  assert.equal(acc.status, 201);
  const sale = await acc.json();
  assert.equal(sale.total, 34.5);
  const sales = await (await fetch(b + "/sales")).json();
  assert.equal(sales.length, 1);
}));
