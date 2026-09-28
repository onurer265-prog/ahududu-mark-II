// cart-agent — Faz 4: terazi verisini kiosk'a bağlayan köprü.
//
//   ESP32 (HX711) --USB seri--> cart-agent --ws://localhost:8787--> kiosk
//
// ESP32 her satıra kalibre gram değerini yazar, örn. "1032.4".
// Kiosk'a giden mesaj: {"type":"weight","grams":1032.4,"stable":true,"t":...}
//
// Kullanım:
//   npm run dev:agent                       # otomatik port bulur
//   SERIAL_PORT=/dev/ttyUSB0 npm run dev:agent
//   npm run dev:agent:fake                  # donanımsız: terminale gram yaz (1030, +500, -85, 0)
import { WebSocketServer } from "ws";
import readline from "node:readline";

const WS_PORT = Number(process.env.AGENT_PORT || 8787);
const BAUD = Number(process.env.BAUD || 115200);
const FAKE = process.argv.includes("--fake");

// ---- Kararlılık filtresi: son N okumanın yayılımı eşik altındaysa "stable"
const WINDOW = 8, STABLE_SPREAD_G = 6;
const recent = [];
function pushReading(g) {
  recent.push(g); if (recent.length > WINDOW) recent.shift();
  const spread = Math.max(...recent) - Math.min(...recent);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  return { grams: Math.round(avg * 10) / 10, stable: recent.length >= 3 && spread <= STABLE_SPREAD_G };
}

// ---- WebSocket yayını
const wss = new WebSocketServer({ port: WS_PORT });
let last = { type: "weight", grams: 0, stable: true, t: Date.now() };
function broadcast(msg) {
  last = msg;
  const s = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(s);
}
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "hello", source: FAKE ? "fake" : "serial" }));
  ws.send(JSON.stringify(last));
  ws.on("message", (raw) => {
    // Kiosk "tare" (dara) isteyebilir → ESP32'ye "t" gönder.
    try { if (JSON.parse(raw).type === "tare") tare(); } catch { /* yok say */ }
  });
});
console.log(`[cart-agent] ws://localhost:${WS_PORT} (${FAKE ? "sahte mod" : "seri mod"})`);

let tare = () => {};

function handleLine(line) {
  const g = Number(String(line).trim());
  if (!Number.isFinite(g)) return; // ESP32 debug satırları vb.
  broadcast({ type: "weight", ...pushReading(Math.max(0, g)), t: Date.now() });
}

// ---- Sahte mod: terminalden gram
if (FAKE) {
  let cur = 0;
  const rl = readline.createInterface({ input: process.stdin });
  console.log("Gram yaz: 1030 (mutlak), +500 / -85 (değişim), 0 (sıfırla)");
  rl.on("line", (l) => {
    const s = l.trim(); if (!s) return;
    const n = Number(s); if (!Number.isFinite(n)) return;
    cur = s.startsWith("+") || s.startsWith("-") ? Math.max(0, cur + n) : n;
    recent.length = 0;
    for (let i = 0; i < 4; i++) handleLine(cur);
    console.log(" →", cur, "g");
  });
  tare = () => { cur = 0; recent.length = 0; handleLine(0); };
} else {
  // ---- Seri mod
  const { SerialPort } = await import("serialport");
  const { ReadlineParser } = await import("@serialport/parser-readline");
  let path = process.env.SERIAL_PORT;
  if (!path) {
    const ports = await SerialPort.list();
    const guess = ports.find((p) => /ttyUSB|ttyACM|usbserial|usbmodem|COM\d+/i.test(p.path));
    if (!guess) {
      console.error("ESP32 bulunamadı. SERIAL_PORT=/dev/ttyUSB0 ile belirt ya da --fake kullan.\nBulunan portlar:", ports.map((p) => p.path));
      process.exit(1);
    }
    path = guess.path;
  }
  const open = () => {
    const port = new SerialPort({ path, baudRate: BAUD });
    port.pipe(new ReadlineParser({ delimiter: "\n" })).on("data", handleLine);
    port.on("open", () => console.log(`[cart-agent] seri port açık: ${path} @ ${BAUD}`));
    port.on("error", (e) => console.error("[cart-agent] seri hata:", e.message));
    port.on("close", () => { console.warn("[cart-agent] port kapandı, 2 sn sonra yeniden denenecek"); setTimeout(open, 2000); });
    tare = () => port.write("t\n");
  };
  open();
}
