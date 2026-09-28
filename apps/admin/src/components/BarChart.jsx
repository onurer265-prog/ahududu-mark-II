import React, { useState } from "react";
import { price } from "../format.js";

// Tek seri dikey çubuk grafik (ciro). Başlık seriyi adlandırır, lejant yok.
// Çubuklar tabana oturur, üst uçları 4px yuvarlak, aralarında 2px boşluk; ızgara silik; üzerine gelince ipucu.
function niceMax(v) {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export default function BarChart({ data, title, caption }) {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [max, max / 2, 0];
  const peak = data.reduce((m, d, i) => (d.value > (data[m]?.value ?? -1) ? i : m), 0);
  const every = data.length > 16 ? 3 : data.length > 10 ? 2 : 1;

  return (
    <figure className="chart">
      <figcaption>
        <div><h3>{title}</h3>{caption && <p>{caption}</p>}</div>
        <button className="link" onClick={() => setTable(!table)} aria-pressed={table}>{table ? "Grafik" : "Tablo"}</button>
      </figcaption>
      {table ? (
        <table className="tbl compact">
          <thead><tr><th>Dönem</th><th className="r">Satış</th><th className="r">Ciro</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.label}><td>{d.label}</td><td className="r">{d.count}</td><td className="r">{price(d.value)}</td></tr>)}</tbody>
        </table>
      ) : (
        <div className="plot" onMouseLeave={() => setHover(null)}>
          <div className="yaxis" aria-hidden="true">{ticks.map((t) => <span key={t}>{Math.round(t).toLocaleString("tr-TR")}</span>)}</div>
          <div className="area">
            {ticks.map((t) => <i key={t} className="grid" style={{ bottom: (t / max) * 100 + "%" }} />)}
            <div className="bars" role="list">
              {data.map((d, i) => (
                <div key={d.label} className={"col" + (hover === i ? " on" : "")} role="listitem"
                  aria-label={`${d.label}: ${price(d.value)}, ${d.count} satış`} tabIndex={0}
                  onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                  {d.value > 0 && <b style={{ height: (d.value / max) * 100 + "%" }} />}
                  {i === peak && d.value > 0 && hover === null && <em style={{ bottom: (d.value / max) * 100 + "%" }}>{price(d.value)}</em>}
                  {hover === i && (
                    <div className="tip" style={{ bottom: Math.min(80, (d.value / max) * 100) + "%" }}>
                      <strong>{d.label}</strong><span>{price(d.value)}</span><span>{d.count} satış</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="xaxis" aria-hidden="true">
              {data.map((d, i) => <span key={d.label}>{i % every === 0 ? d.short : ""}</span>)}
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}
