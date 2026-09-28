// Ahududu API — ürünler, ödeme, satışlar. Bağımlılıksız (node:http).
import http from "node:http";
import { cartTotal, canCheckout, findProduct, validateProduct, verifyWeight } from "@ahududu/domain";

function send(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
  });
}

export function createApp(store) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    const parts = url.pathname.split("/").filter(Boolean); // ["api","products",":bc"]
    const db = store.db;
    try {
      if (req.method === "OPTIONS") return send(res, 204);
      if (parts[0] !== "api") return send(res, 404, { error: "Bulunamadı" });

      if (parts[1] === "health") return send(res, 200, { ok: true });

      if (parts[1] === "products" && parts.length === 2) {
        if (req.method === "GET") return send(res, 200, db.products);
        if (req.method === "POST") {
          const p = await readJson(req);
          const err = validateProduct(p, db.products);
          if (err) return send(res, 400, { error: err });
          const prod = { barcode: String(p.barcode), name: String(p.name).trim(), price: Number(p.price), weight: Number(p.weight) };
          if (p.emoji) prod.emoji = String(p.emoji).slice(0, 8);
          db.products.push(prod); store.save();
          return send(res, 201, prod);
        }
      }
      if (parts[1] === "products" && parts.length === 3) {
        const p = findProduct(db.products, parts[2]);
        if (!p) return send(res, 404, { error: "Ürün yok" });
        if (req.method === "GET") return send(res, 200, p);
        if (req.method === "DELETE") {
          db.products = db.products.filter((x) => x.barcode !== parts[2]); store.save();
          return send(res, 200, { ok: true });
        }
      }

      if (parts[1] === "checkout" && req.method === "POST") {
        const { cart = [], measured = 0, method = "Bilinmiyor", cartId = "cart-1" } = await readJson(req);
        if (!canCheckout(cart, db.products, Number(measured))) {
          return send(res, 409, { error: "Ağırlık doğrulanmadı", verify: verifyWeight(cart, db.products, Number(measured)) });
        }
        const sale = {
          id: store.nextSaleId(), time: new Date().toISOString(), cartId, method,
          total: cartTotal(cart, db.products),
          items: cart.map((i) => { const p = findProduct(db.products, i.barcode); return { barcode: i.barcode, name: p.name, qty: i.qty, price: p.price }; }),
        };
        db.sales.unshift(sale); store.save();
        return send(res, 201, sale);
      }

      if (parts[1] === "sales" && req.method === "GET") return send(res, 200, db.sales);

      return send(res, 404, { error: "Bulunamadı" });
    } catch (e) {
      return send(res, 400, { error: "Geçersiz istek" });
    }
  });
}
