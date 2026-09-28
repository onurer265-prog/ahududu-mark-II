import React, { useMemo, useState } from "react";
import { salesSummary, validateProduct, cleanProduct, AISLES } from "@ahududu/domain";
import { price, kg } from "../format.js";

const EMPTY = { barcode: "", name: "", price: "", weight: "", emoji: "", aisle: "" };

export default function Products({ products, sales, onSave, onDelete }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // düzenlenen barkod
  const [err, setErr] = useState("");
  const sold = useMemo(() => new Map(salesSummary(sales).top.map((t) => [t.barcode, t.qty])), [sales]);

  const list = products.filter((p) => {
    const s = q.trim().toLocaleLowerCase("tr-TR");
    return !s || p.name.toLocaleLowerCase("tr-TR").includes(s) || p.barcode.includes(s);
  });

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const edit = (p) => { setEditing(p.barcode); setErr(""); setF({ barcode: p.barcode, name: p.name, price: String(p.price), weight: String(p.weight), emoji: p.emoji || "", aisle: p.aisle ? String(p.aisle) : "" }); };
  const reset = () => { setEditing(null); setErr(""); setF(EMPTY); };

  async function submit(e) {
    e.preventDefault();
    const p = cleanProduct({ ...f, barcode: f.barcode.trim() });
    const msg = validateProduct(p, products, { update: !!editing });
    if (msg) return setErr(msg);
    const res = await onSave(p, !!editing);
    if (res === true) reset(); else setErr(res);
  }

  return (
    <div className="products">
      <section className="card">
        <div className="head">
          <h3>Ürünler <small>{products.length} kayıt</small></h3>
          <input type="search" placeholder="Ürün adı ya da barkod ara" aria-label="Ürün ara" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="scroll">
          <table className="tbl">
            <thead><tr><th /><th>Ürün</th><th>Barkod</th><th className="r">Fiyat</th><th className="r">Ağırlık</th><th>Reyon</th><th className="r">Satılan</th><th /></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.barcode} className={editing === p.barcode ? "sel" : ""}>
                  <td className="em">{p.emoji || "📦"}</td>
                  <td><b>{p.name}</b></td>
                  <td><code>{p.barcode}</code></td>
                  <td className="r">{price(p.price)}</td>
                  <td className="r">{kg(p.weight)}</td>
                  <td>{p.aisle ? `${p.aisle} · ${AISLES.find((a) => a.no === p.aisle)?.name}` : <span className="muted">—</span>}</td>
                  <td className="r">{sold.get(p.barcode) || 0}</td>
                  <td className="acts">
                    <button className="btn sm plain" onClick={() => edit(p)}>Düzenle</button>
                    <button className="btn sm danger" onClick={() => onDelete(p)}>Sil</button>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={8} className="muted">“{q}” ile eşleşen ürün yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card entry">
        <h3>{editing ? "Ürünü düzenle" : "Ürün girişi"}</h3>
        <p className="muted">Ağırlık, arabadaki terazinin beklediği değerdir. Ürünü tartıp gram olarak yazın; tolerans en az 25 g ya da %3.</p>
        <form onSubmit={submit}>
          <label>Barkod
            <input inputMode="numeric" required value={f.barcode} onChange={set("barcode")} disabled={!!editing} placeholder="8690001000098" />
          </label>
          <label>Ürün adı
            <input required value={f.name} onChange={set("name")} placeholder="Ayran (300ml)" />
          </label>
          <div className="row">
            <label>Fiyat (₺)
              <input type="number" min="0" step="0.01" required value={f.price} onChange={set("price")} />
            </label>
            <label>Ağırlık (g)
              <input type="number" min="1" step="1" required value={f.weight} onChange={set("weight")} />
            </label>
            <label className="narrow">Simge
              <input value={f.emoji} onChange={set("emoji")} placeholder="🥛" maxLength={8} />
            </label>
          </div>
          <label>Reyon <em>arabanın konumu buna göre tahmin edilir</em>
            <select value={f.aisle} onChange={set("aisle")}>
              <option value="">Seçilmedi</option>
              {AISLES.map((a) => <option key={a.no} value={a.no}>{a.no} · {a.name}</option>)}
            </select>
          </label>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="row end">
            {editing && <button type="button" className="btn plain" onClick={reset}>Vazgeç</button>}
            <button className="btn" type="submit">{editing ? "Kaydet" : "Ürün ekle"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
