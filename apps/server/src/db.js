// Ahududu veritabanı — SQLite (Node'un yerleşik node:sqlite modülü, ek kütüphane yok).
// Tek dosya: apps/server/data/ahududu.db. Yedek: `npm run db:yedek`.
//
// Kurallar:
//  - Para kuruş olarak tam sayı saklanır (price_kurus), API'de TL (34.5) döner — yuvarlama hatası olmaz.
//  - Satış kalemleri satış anındaki ad ve fiyatla saklanır; ürün sonradan değişse / silinse geçmiş bozulmaz.
//  - Araba durumları canlı veridir, veritabanına yazılmaz (bellekte Map).
//  - Şema değişince SCHEMA sonuna yeni adım eklenir; PRAGMA user_version hangi adımda olduğunu tutar.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CATALOG_VERSION, DEFAULT_ADS, DEFAULT_PRODUCTS } from "@ahududu/domain";
import { readLegacyJson } from "./legacy-json.js";

const SCHEMA = [
  // 1: ilk şema
  `CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
   CREATE TABLE products (
     barcode TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     brand TEXT,
     price_kurus INTEGER NOT NULL CHECK (price_kurus >= 0),
     weight_g INTEGER NOT NULL CHECK (weight_g > 0),
     emoji TEXT,
     aisle INTEGER
   );
   CREATE TABLE ads (
     id TEXT PRIMARY KEY,
     brand TEXT NOT NULL, title TEXT NOT NULL, text TEXT NOT NULL DEFAULT '', emoji TEXT NOT NULL DEFAULT '',
     tone TEXT NOT NULL, place TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
     position INTEGER NOT NULL
   );
   CREATE TABLE sales (
     id TEXT PRIMARY KEY,
     time TEXT NOT NULL,
     cart_id TEXT, method TEXT,
     total_kurus INTEGER NOT NULL
   );
   CREATE INDEX sales_time ON sales(time);
   CREATE TABLE sale_items (
     sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
     line INTEGER NOT NULL,
     barcode TEXT NOT NULL, name TEXT NOT NULL,
     qty INTEGER NOT NULL CHECK (qty > 0),
     price_kurus INTEGER NOT NULL,
     PRIMARY KEY (sale_id, line)
   );
   CREATE INDEX sale_items_barcode ON sale_items(barcode);
   CREATE TABLE rejects (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     time TEXT NOT NULL, cart_id TEXT, kind TEXT NOT NULL,
     expected_g INTEGER NOT NULL, measured_g INTEGER NOT NULL, total_kurus INTEGER NOT NULL
   );`,
];

const kurus = (tl) => Math.round(Number(tl) * 100);
const tl = (k) => k / 100;
const MAX_REJECTS = 500;

// Satır ↔ API nesnesi
const productOut = (r) => {
  const p = { barcode: r.barcode, name: r.name, price: tl(r.price_kurus), weight: r.weight_g };
  if (r.emoji) p.emoji = r.emoji;
  if (r.brand) p.brand = r.brand;
  if (r.aisle != null) p.aisle = r.aisle;
  return p;
};
const adOut = (r) => ({ id: r.id, brand: r.brand, title: r.title, text: r.text, emoji: r.emoji, tone: r.tone, place: r.place, active: !!r.active });

export function openStore(file = ":memory:", { importJson } = {}) {
  const isNew = file === ":memory:" || !fs.existsSync(file);
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
  if (file !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");

  const tx = (fn) => { db.exec("BEGIN"); try { const r = fn(); db.exec("COMMIT"); return r; } catch (e) { db.exec("ROLLBACK"); throw e; } };

  // Şema adımları
  const ver = db.prepare("PRAGMA user_version").get().user_version;
  for (let v = ver; v < SCHEMA.length; v++) tx(() => { db.exec(SCHEMA[v]); db.exec(`PRAGMA user_version = ${v + 1}`); });

  const q = {
    meta: db.prepare("SELECT value FROM meta WHERE key = ?"),
    setMeta: db.prepare("INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"),
    products: db.prepare("SELECT * FROM products ORDER BY rowid"),
    product: db.prepare("SELECT * FROM products WHERE barcode = ?"),
    insProduct: db.prepare("INSERT INTO products(barcode, name, brand, price_kurus, weight_g, emoji, aisle) VALUES(?, ?, ?, ?, ?, ?, ?)"),
    updProduct: db.prepare("UPDATE products SET name = ?, brand = ?, price_kurus = ?, weight_g = ?, emoji = ?, aisle = ? WHERE barcode = ?"),
    delProduct: db.prepare("DELETE FROM products WHERE barcode = ?"),
    ads: db.prepare("SELECT * FROM ads ORDER BY position, rowid"),
    ad: db.prepare("SELECT * FROM ads WHERE id = ?"),
    insAd: db.prepare("INSERT INTO ads(id, brand, title, text, emoji, tone, place, active, position) VALUES(?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM ads))"),
    updAd: db.prepare("UPDATE ads SET brand = ?, title = ?, text = ?, emoji = ?, tone = ?, place = ?, active = ? WHERE id = ?"),
    delAd: db.prepare("DELETE FROM ads WHERE id = ?"),
    sales: db.prepare("SELECT * FROM sales ORDER BY time DESC, rowid DESC"),
    items: db.prepare("SELECT * FROM sale_items ORDER BY sale_id, line"),
    insSale: db.prepare("INSERT INTO sales(id, time, cart_id, method, total_kurus) VALUES(?, ?, ?, ?, ?)"),
    insItem: db.prepare("INSERT INTO sale_items(sale_id, line, barcode, name, qty, price_kurus) VALUES(?, ?, ?, ?, ?, ?)"),
    rejects: db.prepare(`SELECT * FROM rejects ORDER BY id DESC LIMIT ${MAX_REJECTS}`),
    insReject: db.prepare("INSERT INTO rejects(time, cart_id, kind, expected_g, measured_g, total_kurus) VALUES(?, ?, ?, ?, ?, ?)"),
  };
  const meta = (k) => q.meta.get(k)?.value;
  const setMeta = (k, v) => q.setMeta.run(k, String(v));

  const addProduct = (p) => q.insProduct.run(p.barcode, p.name, p.brand ?? null, kurus(p.price), Math.round(p.weight), p.emoji ?? null, p.aisle ?? null);
  const addAd = (a) => q.insAd.run(a.id, a.brand, a.title, a.text || "", a.emoji || "", a.tone, a.place, a.active === false ? 0 : 1);
  // Eski kayıtlarda eksik alan olabilir (ör. tarih); boş değer veritabanına girmez
  const addSale = (s) => {
    q.insSale.run(s.id, s.time || new Date(0).toISOString(), s.cartId ?? null, s.method ?? null, kurus(s.total || 0));
    (s.items || []).forEach((i, n) => q.insItem.run(s.id, n + 1, String(i.barcode), i.name || String(i.barcode), Math.max(1, i.qty || 1), kurus(i.price || 0)));
  };

  // İlk açılış: eski JSON varsa ondan aktar, yoksa varsayılan katalogla başla
  if (isNew) {
    const legacy = readLegacyJson(importJson);
    tx(() => {
      const src = legacy || { products: DEFAULT_PRODUCTS, ads: DEFAULT_ADS, sales: [], rejects: [], seq: 1000 };
      src.products.forEach(addProduct);
      src.ads.forEach(addAd);
      [...src.sales].reverse().forEach(addSale); // eskiden yeniye
      [...src.rejects].reverse().forEach((r) => q.insReject.run(r.time || new Date(0).toISOString(), r.cartId ?? null, r.kind || "bad", Math.round(r.expected || 0), Math.round(r.measured || 0), kurus(r.total || 0)));
      setMeta("sale_seq", src.seq || 1000);
      setMeta("catalog_version", CATALOG_VERSION);
      if (legacy) { setMeta("imported_from", importJson); setMeta("imported_at", new Date().toISOString()); }
    });
  }
  // Not: CATALOG_VERSION ileride artarsa buraya "meta catalog_version < N ise …" adımı eklenir.

  return {
    file,
    importedFrom: meta("imported_from") || null,
    carts: new Map(), // araba durumları — canlı veri, veritabanına yazılmaz

    products: {
      list: () => q.products.all().map(productOut),
      get: (bc) => { const r = q.product.get(String(bc)); return r ? productOut(r) : null; },
      add: (p) => { addProduct(p); return p; },
      update: (p) => { q.updProduct.run(p.name, p.brand ?? null, kurus(p.price), Math.round(p.weight), p.emoji ?? null, p.aisle ?? null, p.barcode); return p; },
      remove: (bc) => q.delProduct.run(String(bc)).changes > 0,
    },

    ads: {
      list: () => q.ads.all().map(adOut),
      get: (id) => { const r = q.ad.get(String(id)); return r ? adOut(r) : null; },
      add: (a) => { addAd(a); return a; },
      update: (a) => { q.updAd.run(a.brand, a.title, a.text || "", a.emoji || "", a.tone, a.place, a.active === false ? 0 : 1, a.id); return a; },
      remove: (id) => q.delAd.run(String(id)).changes > 0,
    },

    sales: {
      list: () => {
        const items = new Map();
        for (const r of q.items.all()) {
          const l = items.get(r.sale_id) || []; l.push({ barcode: r.barcode, name: r.name, qty: r.qty, price: tl(r.price_kurus) }); items.set(r.sale_id, l);
        }
        return q.sales.all().map((s) => ({ id: s.id, time: s.time, cartId: s.cart_id, method: s.method, total: tl(s.total_kurus), items: items.get(s.id) || [] }));
      },
      /** Yeni satış: fiş no sıradaki numara, hepsi tek işlemde (yarım satış kalmaz). */
      record: ({ cartId, method, items, total, time = new Date().toISOString() }) => tx(() => {
        const seq = Number(meta("sale_seq") || 1000) + 1;
        setMeta("sale_seq", seq);
        const sale = { id: "F-" + seq, time, cartId, method, total, items };
        addSale(sale);
        return sale;
      }),
    },

    rejects: {
      list: () => q.rejects.all().map((r) => ({ time: r.time, cartId: r.cart_id, kind: r.kind, expected: r.expected_g, measured: r.measured_g, total: tl(r.total_kurus) })),
      add: (r) => { q.insReject.run(r.time, r.cartId ?? null, r.kind, Math.round(r.expected), Math.round(r.measured), kurus(r.total || 0)); },
    },

    /** Tutarlı anlık yedek (sunucu çalışırken de alınabilir). */
    backup: (dest) => { fs.mkdirSync(path.dirname(dest), { recursive: true }); db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`); return dest; },
    stats: () => ({
      products: db.prepare("SELECT COUNT(*) n FROM products").get().n,
      ads: db.prepare("SELECT COUNT(*) n FROM ads").get().n,
      sales: db.prepare("SELECT COUNT(*) n FROM sales").get().n,
      rejects: db.prepare("SELECT COUNT(*) n FROM rejects").get().n,
      revenue: tl(db.prepare("SELECT COALESCE(SUM(total_kurus), 0) k FROM sales").get().k),
    }),
    close: () => db.close(),
  };
}
