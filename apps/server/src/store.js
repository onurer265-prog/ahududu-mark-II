// Basit JSON dosya deposu. İleride PostgreSQL'e geçilecek (bkz. CLAUDE.md).
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PRODUCTS } from "@ahududu/domain";

export function createStore(file) {
  let db = { products: DEFAULT_PRODUCTS.map((p) => ({ ...p })), sales: [], rejects: [], seq: 1000 };
  if (file && fs.existsSync(file)) {
    try { db = { ...db, ...JSON.parse(fs.readFileSync(file, "utf8")) }; } catch { /* bozuk dosya: varsayılanla devam */ }
  }
  const save = () => {
    if (!file) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(db, null, 2));
  };
  return {
    get db() { return db; },
    save,
    nextSaleId() { db.seq += 1; return "F-" + db.seq; },
  };
}
