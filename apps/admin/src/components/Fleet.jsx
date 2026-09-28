import React from "react";
import { AISLES, CART_STAGES, LOW_BATTERY, fleetSummary, cartZone } from "@ahududu/domain";
import { price } from "../format.js";

const VERIFY = { empty: "Boş", ok: "Doğrulandı", wait: "Ürün bekleniyor", bad: "Okutulmamış ürün" };
const ZONES = [{ key: "entry", name: "Giriş", sub: "bekleyen arabalar" }, ...AISLES.map((a) => ({ key: a.no, name: "Reyon " + a.no, sub: a.name })), { key: "exit", name: "Kasa / Çıkış", sub: "ödeme" }];
const ago = (iso, now) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60 ? s + " sn önce" : Math.round(s / 60) + " dk önce";
};
const stateOf = (c) => (c.stale ? "stale" : c.stage);

function Battery({ b }) {
  if (!b) return <span className="batt none" title="Pil bilgisi yok">— <small>bilinmiyor</small></span>;
  const pct = Math.round(b.level * 100);
  const low = !b.charging && b.level < LOW_BATTERY;
  return (
    <span className={"batt" + (low ? " low" : "")} title={b.charging ? "Şarj oluyor" : "Pilde"}>
      <i aria-hidden="true"><b style={{ width: pct + "%" }} /></i>
      <code>%{pct}</code>{b.charging && <small aria-label="şarj oluyor">⚡ şarjda</small>}{low && <small>⚠ düşük</small>}
    </span>
  );
}

export default function Fleet({ carts }) {
  const now = Date.now();
  const f = fleetSummary(carts, now);
  const aisleName = (no) => AISLES.find((a) => a.no === no)?.name;

  return (
    <div className="fleet">
      <div className="tiles">
        <div className="tile hero"><span>Araba</span><strong>{f.total}</strong></div>
        <div className="tile"><span>Alışverişte</span><strong>{f.active}</strong></div>
        <div className="tile"><span>Ödemede</span><strong>{f.paying}</strong></div>
        <div className={"tile" + (f.alerts ? " bad" : "")}><span>Okutulmamış ürün</span><strong>{f.alerts ? <><i aria-hidden="true">⚠</i> {f.alerts}</> : 0}</strong></div>
        <div className={"tile" + (f.lowBattery ? " warn" : "")}><span>Düşük şarj</span><strong>{f.lowBattery ? <><i aria-hidden="true">🔋</i> {f.lowBattery}</> : 0}</strong></div>
        <div className={"tile" + (f.offline ? " warn" : "")}><span>Bağlantı yok</span><strong>{f.offline}</strong></div>
      </div>

      <section className="card">
        <div className="head">
          <h3>Market haritası <small>konum: son okutulan ürünün reyonu</small></h3>
          <ul className="legend" aria-label="Renkler">
            {["idle", "shopping", "alert", "paying", "paid", "stale"].map((k) => (
              <li key={k}><i className={"st-" + k} />{k === "stale" ? "Bağlantı yok" : CART_STAGES[k]}</li>
            ))}
          </ul>
        </div>
        <div className="map">
          {ZONES.map((z) => {
            const here = f.list.filter((c) => cartZone(c) === z.key);
            return (
              <div key={z.key} className={"zone" + (typeof z.key === "number" ? "" : " edge")}>
                <b>{z.name}</b><small>{z.sub}</small>
                <div className="chips">
                  {here.map((c) => <span key={c.id} className={"chip st-" + stateOf(c)} title={`#${c.id} · ${c.stale ? "Bağlantı yok" : CART_STAGES[c.stage]}`}>#{c.id}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {f.list.length ? (
        <div className="carts">
          {f.list.map((c) => (
            <section key={c.id} className={"card cartcard st-" + stateOf(c)}>
              <div className="top">
                <h3>#{c.id}</h3>
                <span className={"tag st-" + stateOf(c)}>{c.stale ? "Bağlantı yok" : CART_STAGES[c.stage]}</span>
              </div>
              <dl>
                <dt>Şarj</dt><dd><Battery b={c.battery} /></dd>
                <dt>Konum</dt><dd>{c.stage === "paying" || c.stage === "paid" ? "Kasa / Çıkış" : c.aisle ? `Reyon ${c.aisle} · ${aisleName(c.aisle)}` : "Giriş"}</dd>
                <dt>Ürün</dt><dd><code>{c.items} adet</code></dd>
                <dt>Tutar</dt><dd><code>{price(c.total)}</code></dd>
                <dt>Ağırlık</dt><dd className={"v-" + c.verify}>{VERIFY[c.verify]}</dd>
                <dt>Terazi</dt><dd>{c.scale ? "Bağlı" : "Simülasyon"}</dd>
                <dt>Son sinyal</dt><dd><code>{ago(c.seen, now)}</code></dd>
              </dl>
            </section>
          ))}
        </div>
      ) : (
        <section className="card"><p className="muted">Henüz hiçbir araba bağlanmadı. Kiosk açıldığında (sunucu çalışırken) burada görünür.</p></section>
      )}
    </div>
  );
}
