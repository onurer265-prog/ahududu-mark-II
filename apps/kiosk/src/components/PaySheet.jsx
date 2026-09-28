import React from "react";
import { price } from "./format.js";

// Ödeme yöntemi seçimi ve işlem sırasında bekleme. Tamamlandı ekranı Done.jsx'te.
export default function PaySheet({ pay, total, onMethod, onClose }) {
  if (!pay || pay.stage === "done") return null;
  return (
    <div className="overlay">
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Ödeme">
        {pay.stage === "choose" && <>
          <h2>Ödeme</h2><p><code>{price(total)}</code></p>
          <button className="opt" onClick={() => onMethod("Kart")}><span aria-hidden="true">💳</span><div><b>Kartla öde</b><small>Kartı ekrana ya da arabadaki POS'a yaklaştırın.</small></div></button>
          <button className="opt" onClick={() => onMethod("QR kod")}><span aria-hidden="true">📱</span><div><b>QR kod ile öde</b><small>Banka uygulamanızla ekrandaki kodu okutun.</small></div></button>
          <button className="btn plain wide" onClick={onClose}>Vazgeç</button>
        </>}
        {pay.stage === "processing" && <>
          <h2>Ödeme alınıyor</h2><div className="spin" role="progressbar" aria-label="Ödeme alınıyor" /><p>{pay.method} ile işlem yapılıyor…</p>
        </>}
      </div>
    </div>
  );
}
