// Mark I biçimi: "34,50 ₺", "1.03 kg" / "350 g"
export const price = (n) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
export const kg = (g) => (Math.abs(g) >= 1000 ? (g / 1000).toFixed(2) + " kg" : Math.round(g) + " g");
export const time = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
export const dateTime = (iso) => new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const dayLabel = (d) => d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" });
