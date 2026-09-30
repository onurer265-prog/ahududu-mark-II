// Eski JSON veri dosyası (apps/server/data/db.json) — SQLite'tan önceki depo.
// Yalnızca ilk açılışta veritabanına aktarım için okunur; dosyaya yazılmaz.
import fs from "node:fs";
import { BARCODE_RENAMES, CATALOG_VERSION, DEFAULT_ADS, DEFAULT_PRODUCTS, LEGACY_AD_IDS } from "@ahududu/domain";

/** Eski kaydı güncel kataloğa taşır. Kullanıcının eklediği ürün / reklamlar kalır. */
export function migrate(db) {
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
  }
  // Reyon alanı sonradan geldi
  for (const p of db.products) {
    if (p.aisle == null) { const d = DEFAULT_PRODUCTS.find((x) => x.barcode === p.barcode); if (d) p.aisle = d.aisle; }
  }
  if ((db.catalogVersion || 1) < 2) {
    const have = new Set(db.products.map((p) => p.barcode));
    db.products.push(...DEFAULT_PRODUCTS.filter((p) => !have.has(p.barcode)).map((p) => ({ ...p })));
    const ads = (db.ads || []).filter((a) => !LEGACY_AD_IDS.includes(a.id));
    const haveAd = new Set(ads.map((a) => a.id));
    db.ads = [...DEFAULT_ADS.filter((a) => !haveAd.has(a.id)).map((a) => ({ ...a })), ...ads];
  }
  db.catalogVersion = CATALOG_VERSION;
  return db;
}

/** Dosyayı okuyup taşınmış halini döner; dosya yok ya da bozuksa null. */
export function readLegacyJson(file) {
  if (!file || !fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return migrate({ products: [], ads: [], sales: [], rejects: [], seq: 1000, catalogVersion: 1, ...raw });
  } catch { return null; }
}
