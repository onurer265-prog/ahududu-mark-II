// Web Audio ile basit sesli tepkiler (okutma / onay / uyarı).
let ctx;
function tone(freq, ms, type = "sine", when = 0) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + ms / 1000 + 0.02);
  } catch { /* ses yoksa sessiz geç */ }
}
// Açılış tonu: yumuşak çan sesiyle yükselen do majör arpej (do-mi-sol-do).
function bell(freq, when, ms = 900) {
  tone(freq, ms, "sine", when);
  tone(freq * 2, ms * 0.5, "sine", when); // parlaklık için üst harmonik
}
export const sound = {
  intro: () => {
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume?.(); } catch { return; }
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, i * 0.11, i === 3 ? 1400 : 700));
  },
  scan: () => tone(1320, 90, "square"),
  ok: () => { tone(880, 110); tone(1320, 160, "sine", 0.12); },
  warn: () => { tone(330, 180, "sawtooth"); tone(262, 220, "sawtooth", 0.2); },
};
