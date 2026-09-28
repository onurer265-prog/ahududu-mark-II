import React, { useEffect, useState } from "react";

// Döngülü reklam alanı. variant: "side" (sağ üst) | "bottom" (alt bant).
// ads: bu alana düşen yayındaki reklamlar (adsFor ile süzülmüş). Boşsa alan hiç çizilmez.
// offset: iki alan aynı anda aynı reklamı göstermesin diye başlangıç kaydırması.
const ROTATE_MS = 8000;

export default function AdSlot({ variant, ads, offset = 0 }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, []);
  if (!ads.length) return null;
  const i = (tick + offset) % ads.length; // liste panelden değişse de taşmaz
  const ad = ads[i];

  return (
    <aside className={"ad ad-" + variant + " tone-" + ad.tone} aria-label="Reklam" aria-live="off">
      <div className="ad-in" key={ad.id}>
        <small>SPONSORLU · {ad.brand}</small>
        {ad.emoji && <span className="ad-em" aria-hidden="true">{ad.emoji}</span>}
        <div className="ad-tx"><b>{ad.title}</b>{ad.text && <p>{ad.text}</p>}</div>
      </div>
      {ads.length > 1 && (
        <div className="ad-dots" aria-hidden="true">
          {ads.map((a, n) => <i key={a.id} className={n === i ? "on" : ""} />)}
        </div>
      )}
    </aside>
  );
}
