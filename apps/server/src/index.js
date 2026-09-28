import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createStore } from "./store.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const store = createStore(process.env.DB_FILE || path.join(here, "..", "data", "db.json"));
createApp(store).listen(PORT, () => console.log(`[ahududu-server] http://localhost:${PORT}/api`));
