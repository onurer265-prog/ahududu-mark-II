// Veritabanı yedeği: `npm run db:yedek` → apps/server/data/yedek/ahududu-YYYY-MM-DD_HHMM.db
// Sunucu çalışırken de alınabilir (SQLite VACUUM INTO tutarlı anlık kopya üretir).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openStore } from "./db.js";

const data = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const file = process.env.DB_FILE || path.join(data, "ahududu.db");
if (!fs.existsSync(file)) { console.error("Veritabanı yok: " + file + " (önce sunucuyu bir kez başlatın)"); process.exit(1); }

const d = new Date(), pad = (n) => String(n).padStart(2, "0");
const dest = path.join(data, "yedek", `ahududu-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.db`);
const store = openStore(file);
store.backup(dest);
const s = store.stats();
store.close();
console.log(`Yedek alındı: ${dest}\n${s.products} ürün, ${s.sales} satış (${s.revenue.toFixed(2)} ₺), ${s.ads} reklam, ${s.rejects} ret`);
