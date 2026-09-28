import React, { useState } from "react";
import { fmtG } from "./format.js";

export default function SensorPanel({ products, scaleConnected, measured, onScan, onWeight, onTare, say }) {
  const [manual, setManual] = useState("");
  const [gram, setGram] = useState("100");
  const jitter = (w) => w * (1 + (Math.random() - 0.5) * 0.04);
  const take = (w, name) => {
    if (measured < w * 0.9) return say("Arabada çıkarılacak kadar ağırlık yok.");
    onWeight(-jitter(w), name + " çıkarıldı");
  };
  return (
    <section className="panel" aria-label="Sensör paneli">
      <h2>Sensör paneli</h2>
      <p className="sub">
        Barkod okuyucu USB'ye takılıysa doğrudan okut — kiosk klavye girdisini yakalar.
        {scaleConnected
          ? " Terazi bağlı: ağırlık gerçek sensörden geliyor."
          : " Terazi bağlı değil: Bırak / Çıkar ile ağırlığı simüle et (cart-agent çalışınca otomatik bağlanır)."}
      </p>
      {products.map((p) => (
        <div className="prow" key={p.barcode}>
          <div className="nm">{p.name}<span className="meta">{p.barcode} · {fmtG(p.weight)}</span></div>
          <div className="acts">
            <button className="btn sm" onClick={() => onScan(p.barcode)}>Okut</button>
            {!scaleConnected && <>
              <button className="btn sm ghost" onClick={() => onWeight(jitter(p.weight), p.name + " bırakıldı")}>Bırak</button>
              <button className="btn sm ghost" onClick={() => take(p.weight, p.name)}>Çıkar</button>
            </>}
          </div>
        </div>
      ))}
      <h3>Barkodu elle gir</h3>
      <form className="inline" onSubmit={(e) => { e.preventDefault(); if (manual.trim() && onScan(manual.trim())) setManual(""); }}>
        <input type="text" inputMode="numeric" placeholder="Barkod numarası" aria-label="Barkod numarası" value={manual} onChange={(e) => setManual(e.target.value)} />
        <button className="btn sm" type="submit">Okut</button>
      </form>
      {scaleConnected ? (
        <><h3>Terazi</h3><button className="btn sm ghost" onClick={onTare}>Dara al (sıfırla)</button></>
      ) : (
        <>
          <h3>Barkodsuz ağırlık</h3>
          <div className="inline">
            <input type="number" min="1" step="1" aria-label="Gram" value={gram} onChange={(e) => setGram(e.target.value)} />
            <button className="btn sm ghost" onClick={() => { const g = Math.abs(Number(gram)); if (g) onWeight(g, "Barkodsuz ağırlık"); }}>Ekle</button>
            <button className="btn sm ghost" onClick={() => { const g = Math.abs(Number(gram)); if (!g) return; if (measured < g) return say("Arabada bu kadar ağırlık yok."); onWeight(-g, "Barkodsuz ağırlık"); }}>Çıkar</button>
          </div>
        </>
      )}
      <p className="note">Okutmadan ürün bırakırsan ekran "Okutulmamış ürün" der ve ödeme kapanır.</p>
    </section>
  );
}
