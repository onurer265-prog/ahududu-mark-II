import React from "react";
import { price } from "./format.js";

export default function Done({ sale, onNew }) {
  const count = sale.items.reduce((a, i) => a + i.qty, 0);
  return (
    <main className="done">
      <div className="check" aria-hidden="true">✓</div>
      <h1>Ödeme tamamlandı</h1>
      <code>{price(sale.total)} · {count} ürün</code>
      <p>Kasaya uğramanıza gerek yok. Fiş e-postanıza gönderildi.</p>
      <button className="btn go" onClick={onNew}>Yeni alışveriş başlat</button>
    </main>
  );
}
