import React from "react";
import { findProduct } from "@ahududu/domain";
import { price, kg } from "./format.js";

const TITLE = { empty: "AĞIRLIK DOĞRULAMA", ok: "AĞIRLIK DOĞRULANDI", wait: "ÜRÜNÜ ARABAYA BIRAKIN", bad: "OKUTULMAMIŞ ÜRÜN" };

// Sağ taraf: Sepetim, ağırlık doğrulama, toplam ve ödeme.
export default function CartScreen({ cart, products, verify, total, expected, measured, stable, canPay, onDec, onPay }) {
  const fill = expected > 0 ? Math.min(100, (measured / expected) * 100) : measured > 0 ? 100 : 0;
  return (
    <section className="cart" aria-label="Sepetim">
      <h2 className="label">SEPETİM</h2>
      <ul className="items">
        {cart.length ? cart.map((i) => {
          const p = findProduct(products, i.barcode) || { name: i.barcode, price: 0 };
          return (
            <li key={i.barcode}>
              <span className="em" aria-hidden="true">{p.emoji || "📦"}</span>
              <span className="nm">{p.name} <small>×{i.qty}</small></span>
              <code>{price(p.price * i.qty)}</code>
              <button className="x" onClick={() => onDec(i.barcode)} aria-label={p.name + " sepetten çıkar"} title="Sepetten çıkar">
                <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 2.5l5 5M7.5 2.5l-5 5" /></svg>
              </button>
            </li>
          );
        }) : <li className="empty">Henüz ürün okutulmadı. Soldaki raftan bir ürün seçin.</li>}
      </ul>
      <div className={"verify st-" + verify.kind}>
        <h3>{TITLE[verify.kind]}</h3>
        <code>Beklenen: {kg(expected)}</code>
        <code className="dim">Ölçülen: {kg(measured)}{!stable && " · ölçülüyor…"}</code>
        <div className="meter"><i style={{ width: fill + "%" }} /></div>
      </div>
      <div className="total"><span>Toplam</span><strong>{price(total)}</strong></div>
      <button className="btn pay" disabled={!canPay || !stable} onClick={onPay}>{canPay ? "Öde · " + price(total) : "Öde"}</button>
    </section>
  );
}
