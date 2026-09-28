// Sunucu erişimi. Sunucu kapalıysa kiosk çevrimdışı (yerel katalog) çalışır.
// Kiosk yalnızca okur ve ödeme gönderir; ürün / reklam yönetimi apps/admin'de.
const BASE = import.meta.env.VITE_API_URL || "/api";

async function req(path, opts = {}) {
  const r = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...opts });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || r.statusText), { status: r.status, body });
  return body;
}

export const api = {
  products: () => req("/products"),
  ads: () => req("/ads"),
  checkout: (payload) => req("/checkout", { method: "POST", body: JSON.stringify(payload) }),
};
