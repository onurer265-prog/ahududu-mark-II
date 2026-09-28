# Ahududu 🍇 Akıllı Market Arabası

Okut → arabaya bırak → ağırlık doğrulansın → kasaya uğramadan öde.

## Hızlı başlangıç
Node.js 20+ gerekir (https://nodejs.org → LTS).

```bash
npm install
npm run dev:server        # 1. terminal — API
npm run dev               # 2. terminal — kiosk → http://localhost:5173
npm run dev:agent:fake    # 3. terminal (isteğe bağlı) — sahte terazi, gram yaz: 1030, +85, 0
```

Terazi bağlı değilken kiosk, sensör panelindeki **Bırak / Çıkar** düğmeleriyle ağırlığı simüle eder.
USB barkod okuyucu takılıysa doğrudan okutabilirsin.

## Gerçek terazi
1. `firmware/esp32-scale/esp32-scale.ino` dosyasını Arduino IDE ile ESP32'ye yükle (HX711 kütüphanesi: bogde).
2. Serial Monitor'da (115200) boş terazide `t`, sonra bilinen ağırlıkla `c1000` gönder; çıkan faktörü koda yaz.
3. ESP32'yi USB ile bağla, `npm run dev:agent`. Kiosk üstte "Terazi bağlı" gösterir.

Ayrıntı: `CLAUDE.md`, `docs/raspberry-pi.md`.
