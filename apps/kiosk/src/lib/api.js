// Sunucu erişimi. Sunucu kapalıysa kiosk çevrimdışı (yerel katalog) çalışır.
const BASE = import.meta.env.VITE_API_URL || "/api";

async function req(path, opts = {}) {
  const r = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...opts });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || r.statusText), { status: r.status, body });
  return body;
}

export const api = {
  health: () => req("/health"),
  products: () => req("/products"),
  addProduct: (p) => req("/products", { method: "POST", body: JSON.stringify(p) }),
  deleteProduct: (bc) => req("/products/" + encodeURIComponent(bc), { method: "DELETE" }),
  checkout: (payload) => req("/checkout", { method: "POST", body: JSON.stringify(payload) }),
  sales: () => req("/sales"),
  ads: () => req("/ads"),
};
