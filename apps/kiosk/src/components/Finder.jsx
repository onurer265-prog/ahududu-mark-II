import React, { useMemo, useState } from "react";
import { AISLES, shelfOf, route, routeLength } from "@ahududu/domain";
import StoreMap from "./StoreMap.jsx";
import { price } from "./format.js";

// Ürün bul: ara → ürünün reyonu krokide yanar, arabanın bulunduğu yerden oraya yol çizilir.
// Tam sayfa, reklamsız. Krokideki rafa dokunarak da o reyona yol alınabilir.
const norm = (s) => s.toLocaleLowerCase("tr-TR");
const UNIT_M = 0.04; // 1 kroki birimi ≈ 4 cm (market ≈ 40 m genişliğinde)

export default function Finder({ products, here, onBack, onPick }) {
  const [q, setQ] = useState("");
  const [product, setProduct] = useState(null);
  const [aisle, setAisle] = useState(null);
  const s = norm(q.trim());
  const results = useMemo(() => (s ? products.filter((p) => norm(p.name).includes(s)).slice(0, 8) : []), [products, s]);
  const target = product?.aisle || aisle;
  const shelf = target ? shelfOf(target) : null;
  const meters = shelf ? Math.max(1, Math.round(routeLength(route(here, shelf.stand)) * UNIT_M)) : 0;

  const choose = (p) => { setProduct(p); setAisle(p.aisle || null); };
  const chooseAisle = (no) => { setProduct(null); setAisle(no); };

  return (
    <main className="finder">
      <div className="co-top">
        <button className="back" onClick={onBack}>← Alışverişe dön</button>
        <h1>Ürün bul</h1>
      </div>
      <div className="fd-grid">
        <section className="co-card fd-side">
          <input type="search" className="fd-search" placeholder="Ne arıyorsunuz? Örn. süt, çay, deterjan" aria-label="Ürün ara"
            value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          {s ? (
            <ul className="fd-results">
              {results.map((p) => (
                <li key={p.barcode}>
                  <button className={product?.barcode === p.barcode ? "on" : ""} onClick={() => choose(p)}>
                    <span className="em" aria-hidden="true">{p.emoji || "📦"}</span>
                    <span className="nm">{p.name}<small>{p.aisle ? `Reyon ${p.aisle} · ${shelfOf(p.aisle)?.name}` : "Reyon bilgisi yok"}</small></span>
                  </button>
                </li>
              ))}
              {!results.length && <li className="none">“{q}” bulunamadı.</li>}
            </ul>
          ) : (
            <>
              <h2 className="label">REYONLAR</h2>
              <div className="fd-aisles">
                {AISLES.map((a) => (
                  <button key={a.no} className={aisle === a.no && !product ? "on" : ""} onClick={() => chooseAisle(a.no)}>
                    <b>{a.no}</b> {a.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {shelf && (
            <div className="fd-target" role="status">
              {product && <>
                <span className="em" aria-hidden="true">{product.emoji || "📦"}</span>
                <div className="info"><b>{product.name}</b><code>{price(product.price)}</code></div>
              </>}
              <div className="where">
                <strong>Reyon {shelf.no} · {shelf.name}</strong>
                <span>Yaklaşık {meters} m · krokideki mor çizgiyi izleyin</span>
              </div>
              {product && <button className="btn" onClick={() => onPick(product)}>Sepete ekle</button>}
            </div>
          )}
          {product && !product.aisle && <p className="co-warn">Bu ürünün reyonu tanımlı değil. Mağaza görevlisine sorabilirsiniz.</p>}
        </section>

        <section className="co-card fd-map">
          <StoreMap here={here} target={target} onShelf={chooseAisle} />
          <p className="fd-hint">Konumunuz son okuttuğunuz ürünün reyonuna göre gösterilir. Bir rafa dokunarak da yol alabilirsiniz.</p>
        </section>
      </div>
    </main>
  );
}
