import React from "react";
import { price, kg } from "./format.js";

// Sol taraf: raf (her karta dokunmak = okut + arabaya bırak) ve güvenlik testi.
export default function Shelf({ products, scaleConnected, onPick, onSneak, onClearExtra, extra }) {
  return (
    <section className="shelf" aria-label="Raf">
      <h2 className="label">RAFTAN ÜRÜN AL <span>({scaleConnected ? "okut, sonra arabaya bırak" : "barkod okutma simülasyonu"})</span></h2>
      <div className="pgrid">
        {products.map((p) => (
          <button key={p.barcode} className="pcard" onClick={() => onPick(p)}>
            <span className="em" aria-hidden="true">{p.emoji || "📦"}</span>
            <span className="tx"><b>{p.name}</b><code>{price(p.price)} · {kg(p.weight)}</code></span>
          </button>
        ))}
      </div>
      {!scaleConnected && <>
        <hr />
        <h2 className="label">GÜVENLİK TESTİ</h2>
        <div className="sec">
          <button className="btn warn" onClick={onSneak}>Okutmadan ürün at</button>
          <button className="btn plain" onClick={onClearExtra} disabled={extra <= 0}>Okutulmayanı çıkar</button>
        </div>
      </>}
    </section>
  );
}
