import React, { useState } from "react";
import { validateAd, adsFor } from "@ahududu/domain";

const TONES = [["purple", "Mor"], ["green", "Yeşil"], ["cream", "Krem"]];
const PLACES = [["both", "Sağ üst + alt"], ["side", "Yalnız sağ üst"], ["bottom", "Yalnız alt bant"]];
const PLACE_LABEL = Object.fromEntries(PLACES);
const EMPTY = { brand: "", title: "", text: "", emoji: "", tone: "purple", place: "both", active: true };

// Kiosk'taki reklam kartının aynısı (önizleme)
export function AdPreview({ ad, variant }) {
  return (
    <div className={"ad ad-" + variant + " tone-" + ad.tone}>
      <small>SPONSORLU · {ad.brand || "Marka"}</small>
      {ad.emoji && <span className="ad-em" aria-hidden="true">{ad.emoji}</span>}
      <div className="ad-tx"><b>{ad.title || "Başlık"}</b>{ad.text && <p>{ad.text}</p>}</div>
    </div>
  );
}

export default function Ads({ ads, onSave, onDelete }) {
  const [f, setF] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const edit = (a) => { setEditing(a.id); setErr(""); setF({ ...EMPTY, ...a }); };
  const reset = () => { setEditing(null); setErr(""); setF(EMPTY); };
  const side = adsFor(ads, "side").length, bottom = adsFor(ads, "bottom").length;

  async function submit(e) {
    e.preventDefault();
    const a = editing ? { ...f, id: editing } : { ...f, id: "yeni" };
    const msg = validateAd(a);
    if (msg) return setErr(msg);
    const res = await onSave(a, !!editing);
    if (res === true) reset(); else setErr(res);
  }

  return (
    <div className="products">
      <section className="card">
        <div className="head">
          <h3>Reklamlar <small>{ads.filter((a) => a.active).length} yayında · {ads.length} kayıt</small></h3>
          <span className="muted">Arabada sağ üstte {side}, altta {bottom} reklam dönüyor (8 sn'de bir).</span>
        </div>
        {ads.length ? (
          <ul className="adlist">
            {ads.map((a) => (
              <li key={a.id} className={(a.active ? "" : "off ") + (editing === a.id ? "sel" : "")}>
                <AdPreview ad={a} variant="bottom" />
                <div className="meta">
                  <span className="place">{PLACE_LABEL[a.place]}</span>
                  <label className="switch">
                    <input type="checkbox" checked={a.active} onChange={() => onSave({ ...a, active: !a.active }, true)} />
                    <span>{a.active ? "Yayında" : "Kapalı"}</span>
                  </label>
                  <button className="btn sm plain" onClick={() => edit(a)}>Düzenle</button>
                  <button className="btn sm danger" onClick={() => onDelete(a)}>Sil</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Hiç reklam yok. Arabada reklam alanları gizlenir.</p>}
      </section>

      <section className="card entry">
        <h3>{editing ? "Reklamı düzenle" : "Yeni reklam"}</h3>
        <form onSubmit={submit}>
          <div className="row">
            <label>Marka<input required value={f.brand} onChange={set("brand")} placeholder="Jelibon" /></label>
            <label className="narrow">Simge<input value={f.emoji} onChange={set("emoji")} placeholder="🍬" maxLength={8} /></label>
          </div>
          <label>Başlık <em>{f.title.length}/60</em><input required maxLength={60} value={f.title} onChange={set("title")} placeholder="Şimdi %20 indirimli" /></label>
          <label>Metin <em>{f.text.length}/120</em><input maxLength={120} value={f.text} onChange={set("text")} placeholder="Şekerleme reyonunda, 3. koridor." /></label>
          <fieldset className="seg"><legend>Renk</legend>
            {TONES.map(([k, l]) => (
              <label key={k} className={"tone-" + k + (f.tone === k ? " on" : "")}>
                <input type="radio" name="tone" value={k} checked={f.tone === k} onChange={set("tone")} />{l}
              </label>
            ))}
          </fieldset>
          <label>Yer
            <select value={f.place} onChange={set("place")}>{PLACES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          <label className="check"><input type="checkbox" checked={f.active} onChange={set("active")} /> Yayında</label>
          <div className="preview">
            <span className="muted">Önizleme</span>
            {f.place !== "bottom" && <AdPreview ad={f} variant="side" />}
            {f.place !== "side" && <AdPreview ad={f} variant="bottom" />}
          </div>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="row end">
            {editing && <button type="button" className="btn plain" onClick={reset}>Vazgeç</button>}
            <button className="btn" type="submit">{editing ? "Kaydet" : "Reklam ekle"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
