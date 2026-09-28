import React, { useState } from "react";
import { tl, fmtG } from "./format.js";

export default function SystemView({ products, sales, log, online, onAdd, onDelete }) {
  const [f, setF] = useState({ barcode: "", name: "", price: "", weight: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    const ok = await onAdd({ barcode: f.barcode.trim(), name: f.name.trim(), price: Number(f.price), weight: Number(f.weight) });
    if (ok) setF({ barcode: "", name: "", price: "", weight: "" });
  }
  return (
    <div className="grid">
      <section className="panel">
        <h2>Ürün veritabanı</h2>
        <p className="sub">{online ? "Sunucudaki katalog." : "Sunucu kapalı — değişiklikler yalnızca bu oturumda kalır."} Ağırlık, doğrulamada kullanılan beklenen değerdir.</p>
        <div className="scroll"><table>
          <thead><tr><th>Barkod</th><th>Ürün</th><th className="r">Fiyat</th><th className="r">Ağırlık</th><th /></tr></thead>
          <tbody>{products.map((p) => (
            <tr key={p.barcode}><td>{p.barcode}</td><td>{p.name}</td><td className="r">{tl.format(p.price)}</td><td className="r">{fmtG(p.weight)}</td>
              <td className="r"><button className="btn sm danger" onClick={() => onDelete(p.barcode)}>Sil</button></td></tr>
          ))}</tbody>
        </table></div>
        <form className="form" onSubmit={submit}>
          <div><label htmlFor="pb">Barkod</label><input id="pb" inputMode="numeric" required value={f.barcode} onChange={set("barcode")} /></div>
          <div><label htmlFor="pn">Ürün adı</label><input id="pn" required value={f.name} onChange={set("name")} /></div>
          <div><label htmlFor="pp">Fiyat (TL)</label><input id="pp" type="number" min="0" step="0.01" required value={f.price} onChange={set("price")} /></div>
          <div><label htmlFor="pw">Ağırlık (g)</label><input id="pw" type="number" min="1" step="1" required value={f.weight} onChange={set("weight")} /></div>
          <button className="btn" type="submit">Ürün ekle</button>
        </form>
      </section>
      <section className="panel">
        <h2>Satışlar</h2>
        {sales.length ? sales.map((s) => (
          <div className="sale" key={s.id}>
            <strong>{s.id} · {tl.format(s.total)}</strong>
            <small>{new Date(s.time).toLocaleString("tr-TR")} · {s.method}</small>
            <small>{s.items.map((i) => i.qty + "× " + i.name).join(", ")}</small>
          </div>
        )) : <p className="sub">Henüz satış yok.</p>}
      </section>
      <section className="panel">
        <h2>API kayıtları</h2>
        <div className="log">{log.length ? log.map((l, i) => (
          <div key={i}>{l.t} {l.m} {l.path} <span className={"c" + String(l.code)[0]}>{l.code}</span> {l.note}</div>
        )) : "Kayıt yok."}</div>
      </section>
    </div>
  );
}
