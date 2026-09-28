// Mark I biçimi: "34,50 ₺" ve "1.03 kg" / "350 g"
export const price = (n) => n.toFixed(2).replace(".", ",") + " ₺";
export const kg = (g) => (Math.abs(g) >= 1000 ? (g / 1000).toFixed(2) + " kg" : Math.round(g) + " g");
