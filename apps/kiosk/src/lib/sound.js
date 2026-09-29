// Web Audio ile basit sesli tepkiler (açılış / okutma / onay / uyarı).
let ctx;
function audio() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume?.();
  return ctx;
}
// gain: tepe ses seviyesi, attack: yükselme süresi (sn). Yumuşak başlangıç "tık" sesini önler.
function tone(freq, ms, type = "sine", when = 0, gain = 0.25, attack = 0.01) {
  try {
    const c = audio();
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    const t = c.currentTime + when;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + ms / 1000 + 0.02);
  } catch { /* ses yoksa sessiz geç */ }
}
// Çan: temel ton + hafif üst harmonik (parlak ama yumuşak)
function bell(freq, when, ms = 900, gain = 0.25) {
  tone(freq, ms, "sine", when, gain);
  tone(freq * 2, ms * 0.5, "sine", when, gain * 0.35);
}

export const sound = {
  // Açılış: yükselen do majör arpej (do-mi-sol-do)
  intro: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, i * 0.11, i === 3 ? 1400 : 700)),
  // Ürün eklendi: tatlı iki notalı "di-ding" (mi → la, yukarı doğru, çan tınısı)
  scan: () => { bell(1318.5, 0, 220, 0.16); bell(1760, 0.085, 420, 0.18); },
  // Ağırlık doğrulandı: sol → do, yumuşak onay
  ok: () => { bell(783.99, 0, 260, 0.14); bell(1046.5, 0.1, 480, 0.16); },
  // Okutulmamış ürün: sert vızıltı yerine yumuşak, aşağı inen iki nota (la → fa). Dikkat çeker ama kulak tırmalamaz.
  warn: () => { tone(440, 260, "triangle", 0, 0.22, 0.02); tone(349.23, 380, "triangle", 0.2, 0.2, 0.02); },
};
