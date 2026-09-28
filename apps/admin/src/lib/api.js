// Yönetim paneli sunucu erişimi (kiosk'taki ile aynı biçim, ek olarak düzenleme ve ret kayıtları).
const BASE = import.meta.env.VITE_API_URL || "/api";

async function req(path, opts = {}) {
  const r = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...opts });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || r.statusText), { status: r.status, body });
  return body;
}

export const api = {
  products: () => req("/products"),
  addProduct: (p) => req("/products", { method: "POST", body: JSON.stringify(p) }),
  updateProduct: (p) => req("/products/" + encodeURIComponent(p.barcode), { method: "PUT", body: JSON.stringify(p) }),
  deleteProduct: (bc) => req("/products/" + encodeURIComponent(bc), { method: "DELETE" }),
  sales: () => req("/sales"),
  rejects: () => req("/rejects"),
  ads: () => req("/ads"),
  carts: () => req("/carts"),
  addAd: (a) => req("/ads", { method: "POST", body: JSON.stringify(a) }),
  updateAd: (a) => req("/ads/" + encodeURIComponent(a.id), { method: "PUT", body: JSON.stringify(a) }),
  deleteAd: (id) => req("/ads/" + encodeURIComponent(id), { method: "DELETE" }),
};
