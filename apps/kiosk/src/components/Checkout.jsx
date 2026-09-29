import React from "react";
import { findProduct } from "@ahududu/domain";
import { price } from "./format.js";

// Ödeme sayfası: "Öde"ye basınca açılan tam sayfa. Reklam yok (Onur istedi).
// Solda sipariş özeti, sağda ödeme yöntemleri; ödeme alınırken aynı sayfada bekleme.
const METHODS = [
  { id: "Kart", icon: "💳", title: "Kartla öde", text: "Kartınızı ekrana ya da arabadaki POS cihazına yaklaştırın." },
  { id: "QR kod", icon: "📱", title: "QR kod ile öde", text: "Banka uygulamanızla ekrandaki kodu okutun." },
];

export default function Checkout({ cart, products, total, canPay, stage, method, onMethod, onBack }) {
  const count = cart.reduce((a, i) => a + i.qty, 0);
  const busy = stage === "processing";

  return (
    <main className="checkout">
      <div className="co-top">
        <button className="back" onClick={onBack} disabled={busy}>← Sepete dön</button>
        <h1>Ödeme</h1>
      </div>

      <div className="co-grid">
        <section className="co-card co-summary" aria-label="Sipariş özeti">
          <h2 className="label">SİPARİŞ ÖZETİ <span>· {count} ürün</span></h2>
          <ul>
            {cart.map((i) => {
              const p = findProduct(products, i.barcode) || { name: i.barcode, price: 0 };
              return (
                <li key={i.barcode}>
                  <span className="em" aria-hidden="true">{p.emoji || "📦"}</span>
                  <span className="nm">{p.name}</span>
                  <code className="q">×{i.qty}</code>
                  <code>{price(p.price * i.qty)}</code>
                </li>
              );
            })}
          </ul>
          <div className="co-total"><span>Toplam</span><strong>{price(total)}</strong></div>
        </section>

        <section className="co-card co-pay" aria-label="Ödeme yöntemi">
          {busy ? (
            <div className="co-busy" role="status">
              <div className="spin" aria-hidden="true" />
              <b>Ödeme alınıyor</b>
              <p>{method} ile işlem yapılıyor, lütfen bekleyin…</p>
            </div>
          ) : (
            <>
              <h2 className="label">ÖDEME YÖNTEMİ</h2>
              {!canPay && (
                <p className="co-warn" role="alert">⚠ Arabadaki ağırlık sepetle uyuşmuyor. Sepete dönüp kontrol edin.</p>
              )}
              {METHODS.map((m) => (
                <button key={m.id} className="opt" onClick={() => onMethod(m.id)} disabled={!canPay}>
                  <span className="ic" aria-hidden="true">{m.icon}</span>
                  <span><b>{m.title}</b><small>{m.text}</small></span>
                  <span className="go" aria-hidden="true">›</span>
                </button>
              ))}
              <p className="co-note">Kasaya uğramanıza gerek yok. Fişiniz e-postanıza gönderilir.</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
