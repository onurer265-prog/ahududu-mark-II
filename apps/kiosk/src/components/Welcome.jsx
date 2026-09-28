import React from "react";
import Logo from "./Logo.jsx";

const STEPS = [
  ["🛒", "Raftan aldığın ürünü arabadaki okuyucuya okut"],
  ["⚖️", "Arabadaki terazi ağırlığı otomatik doğrular"],
  ["💳", "Kasaya uğramadan karttan veya QR koddan öde"],
];
const LANGS = [["GB", "English"], ["ES", "Español"], ["DE", "Deutsch"], ["RU", "Русский"], ["SA", "العربية"]];

export default function Welcome({ cartNo, onStart, say }) {
  return (
    <main className="welcome">
      <Logo size={52} label="Ahududu logosu" />
      <div className="eyebrow">ARABA #{cartNo}</div>
      <h1>Ahududu’ya hoş geldiniz</h1>
      <p className="lead">Kasada sıra beklemeden alışveriş. Nasıl çalışıyor:</p>
      <ol className="steps">
        {STEPS.map(([ic, t]) => <li key={t}><span className="ic" aria-hidden="true">{ic}</span>{t}</li>)}
      </ol>
      <button className="btn go" onClick={onStart}>Alışverişe Başla</button>
      <aside className="sponsor" aria-label="Sponsorlu">
        <span className="ic" aria-hidden="true">🍬</span>
        <div><small>SPONSORLU</small><b>Jelibon şimdi %20 indirimli</b></div>
      </aside>
      <footer className="langs">
        <span>Dil / Language</span>
        {LANGS.map(([c, n]) => (
          <button key={c} onClick={() => say(n + " yakında")}><i>{c}</i> {n}</button>
        ))}
      </footer>
    </main>
  );
}
