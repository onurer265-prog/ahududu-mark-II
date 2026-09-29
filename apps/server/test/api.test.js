import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { createStore } from "../src/store.js";
import { BARCODE_RENAMES, DEFAULT_ADS, DEFAULT_PRODUCTS } from "@ahududu/domain";

const SUT = DEFAULT_PRODUCTS[0].barcode; // Süt (1L) 1030 g / 34,50 ₺
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function withServer(fn) {
  const srv = createApp(createStore(null)).listen(0);
  await new Promise((r) => srv.once("listening", r));
  const base = `http://127.0.0.1:${srv.address().port}/api`;
  try { await fn(base); } finally { srv.close(); }
}

test("ürün listesi ve ekleme", () => withServer(async (b) => {
  const list = await (await fetch(b + "/products")).json();
  assert.equal(list.length, DEFAULT_PRODUCTS.length);
  const bad = await fetch(b + "/products", { method: "POST", body: JSON.stringify({ barcode: "1" }) });
  assert.equal(bad.status, 400);
  const ok = await fetch(b + "/products", { method: "POST", body: JSON.stringify({ barcode: "8690009999999", name: "Ekmek", price: 15, weight: 250 }) });
  assert.equal(ok.status, 201);
}));

test("ödeme ağırlık doğrulamasına bağlı", () => withServer(async (b) => {
  const cart = [{ barcode: SUT, qty: 1 }];
  const rej = await fetch(b + "/checkout", { method: "POST", body: JSON.stringify({ cart, measured: 0 }) });
  assert.equal(rej.status, 409);
  const acc = await fetch(b + "/checkout", { method: "POST", body: JSON.stringify({ cart, measured: 1035, method: "POS" }) });
  assert.equal(acc.status, 201);
  const sale = await acc.json();
  assert.equal(sale.total, 34.5);
  const sales = await (await fetch(b + "/sales")).json();
  assert.equal(sales.length, 1);
  const rejects = await (await fetch(b + "/rejects")).json();
  assert.equal(rejects.length, 1);
  assert.equal(rejects[0].kind, "wait");
  assert.equal(rejects[0].expected, 1030);
}));

test("reklam yönetimi", () => withServer(async (b) => {
  const json = (r) => r.json();
  const list = await json(await fetch(b + "/ads"));
  assert.equal(list.length, DEFAULT_ADS.length);
  const bad = await fetch(b + "/ads", { method: "POST", body: JSON.stringify({ brand: "X", title: "", tone: "green", place: "side" }) });
  assert.equal(bad.status, 400);
  const created = await fetch(b + "/ads", { method: "POST", body: JSON.stringify({ brand: "Jelibon", title: "%20 indirim", text: "3. koridor", emoji: "🍬", tone: "green", place: "bottom" }) });
  assert.equal(created.status, 201);
  const ad = await json(created);
  assert.match(ad.id, /^ad-/);
  assert.equal(ad.active, true);
  const off = await json(await fetch(b + "/ads/" + ad.id, { method: "PUT", body: JSON.stringify({ active: false, id: "hack" }) }));
  assert.equal(off.active, false);
  assert.equal(off.id, ad.id);          // id değişmez
  assert.equal(off.title, "%20 indirim"); // gönderilmeyen alanlar korunur
  assert.equal((await fetch(b + "/ads/" + ad.id, { method: "DELETE" })).status, 200);
  assert.equal((await fetch(b + "/ads/" + ad.id, { method: "DELETE" })).status, 404);
  assert.equal((await json(await fetch(b + "/ads"))).length, DEFAULT_ADS.length);
}));

test("araba durumları", () => withServer(async (b) => {
  const post = (id, body) => fetch(b + "/carts/" + id, { method: "POST", body: JSON.stringify(body) });
  assert.equal((await post("0417", { stage: "yok" })).status, 400);
  assert.equal((await post("0417", { stage: "shopping", items: 3, total: 71.4, verify: "ok", battery: { level: 0.8, charging: false }, aisle: 3, scale: false })).status, 200);
  await post("0418", { stage: "idle" });
  await post("0417", { stage: "paying", items: 3, total: 71.4, verify: "ok", aisle: 3 }); // son durum geçerli
  const carts = await (await fetch(b + "/carts")).json();
  assert.deepEqual(carts.map((c) => [c.id, c.stage]), [["0417", "paying"], ["0418", "idle"]]);
  assert.ok(Date.now() - Date.parse(carts[0].seen) < 5000);
}));

// Mark I dönemindeki gibi eski (869…) barkodlu 8 ürün
const OLD = Object.keys(BARCODE_RENAMES);
const oldMarkI = () => DEFAULT_PRODUCTS.slice(0, 8).map(({ aisle, ...p }, i) => ({ ...p, barcode: OLD[i] }));
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ahududu-")), "db.json");

test("eski veri dosyası yeni kataloğa bir kez taşınır", () => {
  const file = tmpFile();
  const old = {
    products: [...oldMarkI(), { barcode: "8690009999999", name: "Benim ürünüm", price: 5, weight: 100 }],
    ads: [{ id: "ad-zeytin", brand: "Eski", title: "Eski varsayılan", tone: "purple", place: "both", active: true },
      { id: "ad-benim", brand: "Benim", title: "Benim reklamım", tone: "green", place: "side", active: true }],
    sales: [{ id: "F-1001", total: 46.5, items: [{ barcode: OLD[0], name: "Süt (1L)", qty: 1, price: 34.5 }, { barcode: OLD[1], name: "Ekmek", qty: 1, price: 12 }] }],
    rejects: [], seq: 1001,
  };
  fs.writeFileSync(file, JSON.stringify(old));
  let db = createStore(file).db;
  assert.equal(db.catalogVersion, 3);
  assert.ok(!db.products.some((p) => BARCODE_RENAMES[p.barcode]));             // eski barkod kalmadı
  assert.deepEqual(db.sales[0].items.map((i) => i.barcode), [SUT, DEFAULT_PRODUCTS[1].barcode]); // satış geçmişi çevrildi
  assert.equal(db.sales[0].total, 46.5);
  assert.equal(db.products.length, DEFAULT_PRODUCTS.length + 1);               // yeni ürünler + benim ürünüm
  assert.ok(db.products.find((p) => p.barcode === "8690009999999"));
  assert.equal(db.products[0].aisle, 2);                                        // reyon eklendi
  assert.ok(!db.ads.some((a) => a.id === "ad-zeytin"));                         // eski varsayılan reklam gitti
  assert.ok(db.ads.some((a) => a.id === "ad-benim"));                           // kullanıcının reklamı kaldı
  assert.equal(db.ads.length, DEFAULT_ADS.length + 1);
  assert.equal(db.sales.length, 1);                                             // satış geçmişi korunur
  // Kullanıcı bir varsayılan ürünü silerse yeniden yüklemede geri gelmez
  db.products = db.products.filter((p) => p.barcode !== DEFAULT_PRODUCTS[20].barcode);
  fs.writeFileSync(file, JSON.stringify(db));
  db = createStore(file).db;
  assert.ok(!db.products.some((p) => p.barcode === DEFAULT_PRODUCTS[20].barcode));
});

test("sürüm 2 dosyası (büyük katalog + eski Mark I barkodları) sürüm 3'e taşınır", () => {
  const file = tmpFile();
  const v2 = {
    catalogVersion: 2,
    products: [...oldMarkI(), ...DEFAULT_PRODUCTS.slice(8).map((p) => ({ ...p })), { barcode: "8690009999999", name: "Benim ürünüm", price: 5, weight: 100 }],
    ads: DEFAULT_ADS.map((a) => ({ ...a })),
    sales: [{ id: "F-1001", total: 34.5, items: [{ barcode: OLD[0], name: "Süt (1L)", qty: 1, price: 34.5 }] }], rejects: [], seq: 1001,
  };
  fs.writeFileSync(file, JSON.stringify(v2));
  const db = createStore(file).db;
  assert.equal(db.catalogVersion, 3);
  assert.equal(db.products.length, DEFAULT_PRODUCTS.length + 1);               // ikilenme yok
  assert.equal(new Set(db.products.map((p) => p.barcode)).size, db.products.length);
  assert.equal(db.products[0].barcode, SUT);
  assert.equal(db.sales[0].items[0].barcode, SUT);
  assert.equal(db.ads.length, DEFAULT_ADS.length);                              // reklamlara dokunulmadı
  assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).catalogVersion, 3);    // diske yazıldı
});

test("ürün düzenleme", () => withServer(async (b) => {
  const put = (bc, body) => fetch(b + "/products/" + bc, { method: "PUT", body: JSON.stringify(body) });
  const ok = await put(SUT, { barcode: "999999", name: "Süt (1L)", price: 36.9, weight: 1030, emoji: "🥛" });
  assert.equal(ok.status, 200);
  const p = await ok.json();
  assert.equal(p.barcode, SUT); // barkod değişmez
  assert.equal(p.price, 36.9);
  assert.equal((await put(SUT, { name: "", price: 1, weight: 1 })).status, 400);
  assert.equal((await put("8690009999999", { name: "x", price: 1, weight: 1 })).status, 404);
}));
