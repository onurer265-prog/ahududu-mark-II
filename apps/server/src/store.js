// Basit JSON dosya deposu. İleride PostgreSQL'e geçilecek (bkz. CLAUDE.md).
import fs from "node:fs";
import path from "node:path";
import { BARCODE_RENAMES, CATALOG_VERSION, DEFAULT_ADS, DEFAULT_PRODUCTS, LEGACY_AD_IDS } from "@ahududu/domain";

const fresh = () => ({
  products: DEFAULT_PRODUCTS.map((p) => ({ ...p })), ads: DEFAULT_ADS.map((a) => ({ ...a })),
  sales: [], rejects: [], seq: 1000, catalogVersion: CATALOG_VERSION,
});

/** Eski dosyayı güncel kataloğa taşır (bir kez). Kullanıcının eklediği ürün / reklamlar kalır. */
export function migrate(db) {
  let changed = false;
  // Sürüm 3: Mark I'in geçersiz 869… barkodları → geçerli 2000001… (ürünler + satış geçmişi). Katalog eklenmeden önce.
  if ((db.catalogVersion || 1) < 3) {
    const have = new Set(db.products.map((p) => p.barcode));
    db.products = db.products.filter((p) => {
      const to = BARCODE_RENAMES[p.barcode];
      if (!to) return true;
      if (have.has(to)) return false; // yenisi zaten varsa eskiyi at
      p.barcode = to; return true;
    });
    for (const s of db.sales) for (const i of s.items || []) if (BARCODE_RENAMES[i.barcode]) i.barcode = BARCODE_RENAMES[i.barcode];
    changed = true;
  }
  // Reyon alanı sonradan geldi
  for (const p of db.products) {
    if (p.aisle == null) { const d = DEFAULT_PRODUCTS.find((x) => x.barcode === p.barcode); if (d) { p.aisle = d.aisle; changed = true; } }
  }
  if ((db.catalogVersion || 1) < 2) {
    const have = new Set(db.products.map((p) => p.barcode));
    db.products.push(...DEFAULT_PRODUCTS.filter((p) => !have.has(p.barcode)).map((p) => ({ ...p })));
    const ads = (db.ads || []).filter((a) => !LEGACY_AD_IDS.includes(a.id));
    const haveAd = new Set(ads.map((a) => a.id));
    db.ads = [...DEFAULT_ADS.filter((a) => !haveAd.has(a.id)).map((a) => ({ ...a })), ...ads];
    changed = true;
  }
  if (db.catalogVersion !== CATALOG_VERSION) { db.catalogVersion = CATALOG_VERSION; changed = true; }
  return changed;
}

export function createStore(file) {
  let db = fresh();
  let changed = false;
  if (file && fs.existsSync(file)) {
    try { db = { ...fresh(), catalogVersion: 1, ...JSON.parse(fs.readFileSync(file, "utf8")) }; changed = migrate(db); }
    catch { /* bozuk dosya: varsayılanla devam */ }
  }
  const save = () => {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(db, null, 2));
  };
  if (changed) save();
  return {
    get db() { return db; },
    carts: new Map(), // araba durumları — canlı veri, diske yazılmaz
    save,
    nextSaleId() { db.seq += 1; return "F-" + db.seq; },
  };
}
