# Ahududu 🍇 Akıllı Market Arabası

Okut → arabaya bırak → ağırlık doğrulansın → kasaya uğramadan öde.

## Hızlı başlangıç
Node.js 22.13+ gerekir (https://nodejs.org → LTS; veritabanı Node'un yerleşik SQLite'ını kullanır).

```bash
npm install
npm run dev:server        # 1. terminal — API + veritabanı
npm run dev               # 2. terminal — kiosk → http://localhost:5173
npm run dev:admin         # 3. terminal — yönetim paneli → http://localhost:5174
npm run dev:agent:fake    # 4. terminal (isteğe bağlı) — sahte terazi, gram yaz: 1030, +85, 0
```

Terazi bağlı değilken kiosk, raftaki ürüne dokununca ürünü okutup arabaya bırakmayı simüle eder.
USB barkod okuyucu takılıysa doğrudan okutabilirsin.

## Veritabanı
Veriler (ürünler, satışlar, reklamlar, ağırlık retleri) `apps/server/data/ahududu.db` SQLite dosyasında durur; ilk açılışta
otomatik oluşur. Yedek almak için:

```bash
npm run db:yedek          # → apps/server/data/yedek/ahududu-TARIH_SAAT.db
```

Yedeği geri yüklemek: sunucuyu durdur, yedek dosyayı `apps/server/data/ahududu.db` adıyla kopyala, sunucuyu başlat.

## Gerçek terazi
1. `firmware/esp32-scale/esp32-scale.ino` dosyasını Arduino IDE ile ESP32'ye yükle (HX711 kütüphanesi: bogde).
2. Serial Monitor'da (115200) boş terazide `t`, sonra bilinen ağırlıkla `c1000` gönder; çıkan faktörü koda yaz.
3. ESP32'yi USB ile bağla, `npm run dev:agent`. Kiosk üstte "Terazi bağlı" gösterir.

Ayrıntı: `CLAUDE.md`, `docs/raspberry-pi.md`.
