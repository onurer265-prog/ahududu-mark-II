// Ahududu API — ürünler, ödeme, satışlar. Bağımlılıksız (node:http).
import http from "node:http";
import { cartTotal, canCheckout, cleanAd, cleanCartStatus, cleanProduct, findProduct, validateAd, validateProduct, verifyWeight } from "@ahududu/domain";

const MAX_REJECTS = 500;

function send(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
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
          const prod = cleanProduct(p);
          db.products.push(prod); store.save();
          return send(res, 201, prod);
        }
      }
      if (parts[1] === "products" && parts.length === 3) {
        const p = findProduct(db.products, parts[2]);
        if (!p) return send(res, 404, { error: "Ürün yok" });
        if (req.method === "GET") return send(res, 200, p);
        if (req.method === "PUT") {
          const body = { ...(await readJson(req)), barcode: parts[2] }; // barkod değiştirilemez
          const err = validateProduct(body, db.products, { update: true });
          if (err) return send(res, 400, { error: err });
          const prod = cleanProduct(body);
          db.products = db.products.map((x) => (x.barcode === prod.barcode ? prod : x)); store.save();
          return send(res, 200, prod);
        }
        if (req.method === "DELETE") {
          db.products = db.products.filter((x) => x.barcode !== parts[2]); store.save();
          return send(res, 200, { ok: true });
        }
      }

      if (parts[1] === "checkout" && req.method === "POST") {
        const { cart = [], measured = 0, method = "Bilinmiyor", cartId = "cart-1" } = await readJson(req);
        if (!canCheckout(cart, db.products, Number(measured))) {
          const verify = verifyWeight(cart, db.products, Number(measured));
          // Yönetim paneli "ağırlık reddi" olarak gösterir
          db.rejects.unshift({ time: new Date().toISOString(), cartId, kind: verify.kind, expected: verify.expected, measured: verify.measured, total: cartTotal(cart, db.products) });
          db.rejects.length = Math.min(db.rejects.length, MAX_REJECTS); store.save();
          return send(res, 409, { error: "Ağırlık doğrulanmadı", verify });
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
      if (parts[1] === "rejects" && req.method === "GET") return send(res, 200, db.rejects);

      // Araba durumları: kiosk ~5 sn'de bir POST eder, panel GET ile okur. Bellekte tutulur (diske yazılmaz).
      if (parts[1] === "carts" && parts.length === 2 && req.method === "GET") {
        return send(res, 200, [...store.carts.values()].sort((a, b) => a.id.localeCompare(b.id)));
      }
      if (parts[1] === "carts" && parts.length === 3 && req.method === "POST") {
        const { status, error } = cleanCartStatus(parts[2], await readJson(req));
        if (error) return send(res, 400, { error });
        const rec = { ...status, seen: new Date().toISOString() };
        store.carts.set(rec.id, rec);
        return send(res, 200, rec);
      }

      // Reklamlar: kiosk GET ile hepsini alır ve yayında olanları gösterir; panel ekler / düzenler / siler.
      if (parts[1] === "ads" && parts.length === 2) {
        if (req.method === "GET") return send(res, 200, db.ads);
        if (req.method === "POST") {
          const a = { ...(await readJson(req)), id: "ad-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) };
          const err = validateAd(a);
          if (err) return send(res, 400, { error: err });
          const ad = cleanAd(a);
          db.ads.push(ad); store.save();
          return send(res, 201, ad);
        }
      }
      if (parts[1] === "ads" && parts.length === 3) {
        const cur = db.ads.find((a) => a.id === parts[2]);
        if (!cur) return send(res, 404, { error: "Reklam yok" });
        if (req.method === "PUT") {
          const a = { ...cur, ...(await readJson(req)), id: cur.id };
          const err = validateAd(a);
          if (err) return send(res, 400, { error: err });
          const ad = cleanAd(a);
          db.ads = db.ads.map((x) => (x.id === ad.id ? ad : x)); store.save();
          return send(res, 200, ad);
        }
        if (req.method === "DELETE") {
          db.ads = db.ads.filter((x) => x.id !== cur.id); store.save();
          return send(res, 200, { ok: true });
        }
      }

      return send(res, 404, { error: "Bulunamadı" });
    } catch (e) {
      return send(res, 400, { error: "Geçersiz istek" });
    }
  });
}
