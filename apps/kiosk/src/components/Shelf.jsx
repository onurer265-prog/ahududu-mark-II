import React, { useMemo, useState } from "react";
import { AISLES } from "@ahududu/domain";
import { price, kg } from "./format.js";

// Sol taraf: raf (her karta dokunmak = okut + arabaya bırak) ve güvenlik testi.
// Katalog büyük olduğu için reyon sekmeleri + arama var.
const norm = (s) => s.toLocaleLowerCase("tr-TR");

export default function Shelf({ products, scaleConnected, onPick, onSneak, onClearExtra, extra }) {
  const [aisle, setAisle] = useState(AISLES[0].no);
  const [q, setQ] = useState("");
  const counts = useMemo(() => Object.fromEntries(AISLES.map((a) => [a.no, products.filter((p) => p.aisle === a.no).length])), [products]);
  const s = norm(q.trim());
  const list = s
    ? products.filter((p) => norm(p.name).includes(s) || p.barcode.includes(s))
    : products.filter((p) => (aisle ? p.aisle === aisle : !p.aisle));
  const unassigned = products.filter((p) => !p.aisle).length;

  return (
    <section className="shelf" aria-label="Raf">
      <div className="shelf-head">
        <h2 className="label">RAFTAN ÜRÜN AL <span>({scaleConnected ? "okut, sonra arabaya bırak" : "barkod okutma simülasyonu"})</span></h2>
        <input type="search" className="find" placeholder="Ürün ara" aria-label="Ürün ara" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!s && (
        <div className="aisles" role="tablist" aria-label="Reyonlar">
          {AISLES.filter((a) => counts[a.no]).map((a) => (
            <button key={a.no} role="tab" aria-selected={aisle === a.no} onClick={() => setAisle(a.no)}>
              {a.name} <small>{counts[a.no]}</small>
            </button>
          ))}
          {unassigned > 0 && <button role="tab" aria-selected={aisle === null} onClick={() => setAisle(null)}>Diğer <small>{unassigned}</small></button>}
        </div>
      )}
      <div className="pgrid">
        {list.map((p) => (
          <button key={p.barcode} className="pcard" onClick={() => onPick(p)}>
            <span className="em" aria-hidden="true">{p.emoji || "📦"}</span>
            <span className="tx"><b>{p.name}</b><code>{price(p.price)} · {kg(p.weight)}</code></span>
          </button>
        ))}
        {!list.length && <p className="none">“{q}” ile eşleşen ürün yok.</p>}
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
