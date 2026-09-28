import React, { useMemo, useState } from "react";
import { salesSummary, bucketSales } from "@ahududu/domain";
import BarChart from "./BarChart.jsx";
import { price, kg, time, dateTime, dayLabel } from "../format.js";

const PERIODS = [["today", "Bugün"], ["7", "Son 7 gün"], ["30", "Son 30 gün"]];
const REJECT = { wait: "Eksik ağırlık", bad: "Okutulmamış ürün", empty: "Boş sepet" };

function since(period, now) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period !== "today") d.setDate(d.getDate() - (Number(period) - 1));
  return d;
}

export default function Overview({ sales, rejects, products }) {
  const [period, setPeriod] = useState("today");
  const now = new Date();
  const from = since(period, now);
  const sum = useMemo(() => salesSummary(sales, from), [sales, period]); // eslint-disable-line react-hooks/exhaustive-deps
  const rej = rejects.filter((r) => new Date(r.time) >= from);

  const chart = useMemo(() => {
    if (period === "today") {
      const h = bucketSales(sum.sales, "hour");
      const used = h.filter((x) => x.count).map((x) => x.key);
      const lo = Math.min(8, ...used), hi = Math.max(22, ...used);
      return h.slice(lo, hi + 1).map((x) => ({ label: String(x.key).padStart(2, "0") + ":00", short: String(x.key).padStart(2, "0"), value: x.total, count: x.count }));
    }
    return bucketSales(sum.sales, "day", now, Number(period)).map((x) => ({ label: dayLabel(x.key), short: String(x.key.getDate()), value: x.total, count: x.count }));
  }, [sum, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const emoji = (bc) => products.find((p) => p.barcode === bc)?.emoji || "📦";
  const topMax = Math.max(1, ...sum.top.map((t) => t.qty));

  return (
    <div className="overview">
      <div className="filters" role="radiogroup" aria-label="Dönem">
        {PERIODS.map(([k, l]) => (
          <button key={k} role="radio" aria-checked={period === k} className={period === k ? "on" : ""} onClick={() => setPeriod(k)}>{l}</button>
        ))}
      </div>

      <div className="tiles">
        <div className="tile hero"><span>Ciro</span><strong>{price(sum.revenue)}</strong></div>
        <div className="tile"><span>Satış</span><strong>{sum.count}</strong></div>
        <div className="tile"><span>Ortalama sepet</span><strong>{price(sum.avg)}</strong></div>
        <div className="tile"><span>Satılan ürün</span><strong>{sum.items}</strong></div>
        <div className={"tile" + (rej.length ? " warn" : "")}>
          <span>Ağırlık reddi</span>
          <strong>{rej.length ? <><i aria-hidden="true">⚠</i> {rej.length}</> : 0}</strong>
        </div>
      </div>

      <div className="two">
        <section className="card">
          <BarChart data={chart} title={period === "today" ? "Saatlik ciro" : "Günlük ciro"} caption="₺ · çubuğun üzerine gelince ayrıntı" />
        </section>
        <section className="card">
          <h3>En çok satanlar</h3>
          {sum.top.length ? (
            <ol className="top">
              {sum.top.slice(0, 6).map((t) => (
                <li key={t.barcode}>
                  <span className="em" aria-hidden="true">{emoji(t.barcode)}</span>
                  <span className="nm">{t.name}</span>
                  <span className="meter" aria-hidden="true"><i style={{ width: (t.qty / topMax) * 100 + "%" }} /></span>
                  <code>{t.qty} adet</code>
                  <code className="dim">{price(t.revenue)}</code>
                </li>
              ))}
            </ol>
          ) : <p className="muted">Bu dönemde satış yok.</p>}
        </section>
      </div>

      <div className="two">
        <section className="card">
          <h3>Son satışlar</h3>
          {sum.sales.length ? (
            <table className="tbl">
              <thead><tr><th>Saat</th><th>Fiş</th><th>Araba</th><th className="r">Ürün</th><th>Ödeme</th><th className="r">Tutar</th></tr></thead>
              <tbody>{sum.sales.slice(0, 8).map((s) => (
                <tr key={s.id}>
                  <td><code>{period === "today" ? time(s.time) : dateTime(s.time)}</code></td>
                  <td><code>{s.id}</code></td>
                  <td>{(s.cartId || "").replace("cart-", "#")}</td>
                  <td className="r">{s.items.reduce((a, i) => a + i.qty, 0)}</td>
                  <td>{s.method}</td>
                  <td className="r">{price(s.total)}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="muted">Bu dönemde satış yok.</p>}
        </section>
        <section className="card">
          <h3>Ağırlık reddi <small>ödeme sırasında terazi tutmadı</small></h3>
          {rej.length ? (
            <ul className="rejects">
              {rej.slice(0, 8).map((r, i) => (
                <li key={r.time + i}>
                  <code>{period === "today" ? time(r.time) : dateTime(r.time)}</code>
                  <span className={"tag " + r.kind}><i aria-hidden="true">{r.kind === "bad" ? "⚠" : "…"}</i> {REJECT[r.kind] || r.kind}</span>
                  <code className="dim">beklenen {kg(r.expected)} · ölçülen {kg(r.measured)}</code>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Ret yok. Bütün ödemelerde ağırlık doğrulandı.</p>}
        </section>
      </div>
    </div>
  );
}
