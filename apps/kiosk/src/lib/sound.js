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
export const sound = {
  scan: () => tone(1320, 90, "square"),
  ok: () => { tone(880, 110); tone(1320, 160, "sine", 0.12); },
  warn: () => { tone(330, 180, "sawtooth"); tone(262, 220, "sawtooth", 0.2); },
};
