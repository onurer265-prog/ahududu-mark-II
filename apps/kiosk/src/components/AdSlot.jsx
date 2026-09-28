import React, { useEffect, useState } from "react";
import { ADS } from "../lib/ads.js";

// Döngülü reklam alanı. variant: "side" (sağ dikey sütun) | "bottom" (alt yatay bant).
// offset: iki alan aynı anda aynı reklamı göstermesin diye başlangıç kaydırması.
const ROTATE_MS = 8000;

export default function AdSlot({ variant, offset = 0, ads = ADS }) {
  const [i, setI] = useState(offset % ads.length);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % ads.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [ads.length]);
  const ad = ads[i];

  return (
    <aside className={"ad ad-" + variant + " tone-" + ad.tone} aria-label="Reklam" aria-live="off">
      <div className="ad-in" key={ad.id}>
        <small>SPONSORLU · {ad.brand}</small>
        <span className="ad-em" aria-hidden="true">{ad.emoji}</span>
        <div className="ad-tx"><b>{ad.title}</b><p>{ad.text}</p></div>
      </div>
      <div className="ad-dots" aria-hidden="true">
        {ads.map((a, n) => <i key={a.id} className={n === i ? "on" : ""} />)}
      </div>
    </aside>
  );
}
