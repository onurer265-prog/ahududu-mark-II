import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { openStore } from "./db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const data = path.join(here, "..", "data");
const PORT = Number(process.env.PORT || 3000);
// Veritabanı: apps/server/data/ahududu.db. İlk açılışta eski db.json varsa oradan aktarılır (dosyaya dokunulmaz).
const store = openStore(process.env.DB_FILE || path.join(data, "ahududu.db"), { importJson: path.join(data, "db.json") });
const s = store.stats();
console.log(`[ahududu-server] veritabanı ${store.file} · ${s.products} ürün, ${s.sales} satış, ${s.ads} reklam${store.importedFrom ? " · db.json'dan aktarıldı" : ""}`);
createApp(store).listen(PORT, () => console.log(`[ahududu-server] http://localhost:${PORT}/api`));
