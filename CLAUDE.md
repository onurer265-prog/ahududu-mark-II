# Ahududu — Akıllı Market Arabası

Bu dosya Claude Code için proje bağlamıdır. Kullanıcıyla **Türkçe** konuş; adı **Onur**.

## Geçmiş
- İlk proje eski bilgisayarda yerel bir Claude Code oturumundaydı ve GitHub'a hiç yüklenmemişti.
  Bilgisayar bozulunca kod kaybedildi (Eylül 2026). Bu depo, claude.ai'da kalan
  yayınlanmış sayfalardan (simülasyon, rehberler, donanım listesi) **yeniden kuruldu**.
- Bu depo **Ahududu Mark II**. Eski bilgisayardaki kayıp sürüm Mark I; arayüzü Mark I videolarından birebir yeniden yapıldı.
- GitHub (gizli): https://github.com/onurer265-prog/ahududu-mark-II — yerelde `C:\Users\onure\Ahududu\ahududu-market`.
- **Kural:** her anlamlı adımdan sonra commit + `git push`. Kod bir daha tek diskte kalmasın.

## Ürün fikri
Arabanın üzerinde dokunmatik ekran, barkod okuyucu, altında ağırlık sensörü (terazi).
Müşteri ürünü okutup arabaya bırakır; sistem ağırlıkla doğrular; müşteri kasaya uğramadan
ekrandan ya da arabadaki POS'tan öder. Referanslar: Amazon Dash Cart, Cust2mate.
Marka rengi mor (#6A2C9E). MVP: **barkod okuyucu + ağırlık sensörü**.

## Mimari
```
ESP32 + HX711 + yük hücresi ──USB seri──▶ cart-agent (Pi) ──ws://:8787──▶ kiosk (Chromium tam ekran)
                                                                           │
                                                                    HTTP /api
                                                                           ▼
                                                                    server (:3000)
```

| Klasör | Ne |
|---|---|
| `packages/domain` | Ortak iş kuralları: sepet, beklenen ağırlık, tolerans (max 25 g, %3), doğrulama, ürün validasyonu, satış özeti ve saatlik/günlük kovalar (panel). `@ahududu/domain/logo`: logo geometrisi. Testli. |
| `apps/kiosk` | React + Vite arayüz, **Mark I görünümü** (eski projenin videolarından birebir): mor üst bar "Ahududu · ARABA #0417", Karşılama → Alışveriş (solda raf + Güvenlik testi, sağda Sepetim + Ağırlık doğrulama) → Ödeme tamamlandı. Açılışta ~2,6 sn splash (`Splash.jsx`: taneler ortada buluşup logoyu kurar, "Ahududu" + mor el yazısı "alışverişin en kolay hali" (Caveat), açılış tonu `sound.intro()`; Pi'de ses için Chromium `--autoplay-policy=no-user-gesture-required`). Krem zemin, koyu yeşil eylem düğmeleri (#2E6A4C, taç #173B2F), fiyat/ağırlık mono yazı (Sora + IBM Plex Mono). Logo ve palet claude.ai'daki "Ahududu Logo" kitinden (`components/Logo.jsx`: dokuz damla + yeşil taç); mor #6A2C9E. Geliştirici araçları üst bardaki "Sistem" sekmesinde. Reklam alanları (`AdSlot.jsx`, 8 sn'de bir döner; reklamlar sunucudan `GET /api/ads`, panelden yönetilir, sunucu kapalıyken `DEFAULT_ADS`): alışveriş ve ödeme-tamamlandı ekranlarında sağ üstte (sepetin üstünde) ve altta bant; karşılama ekranında yok (Onur istemedi). Dar ekranda sağ reklam gizlenir, sepet raftan hemen sonra gelir. Barkod okuyucuyu klavye olayı olarak yakalar (USB-HID). cart-agent'a WebSocket ile bağlanır; bağlı değilse terazi simülasyonuna düşer. Sunucu kapalıysa çevrimdışı yerel katalogla çalışır. |
| `apps/admin` | Yönetim paneli (React + Vite, :5174). **Genel Bakış**: dönem filtresi (bugün / 7 / 30 gün), ciro, satış, ortalama sepet, satılan ürün, ağırlık reddi; saatlik/günlük ciro grafiği; en çok satanlar; son satışlar; ret listesi. **Ürün Girişi**: ekle / düzenle (barkod kilitli) / sil / ara. **Reklamlar**: ekle / düzenle / sil, yayında-kapalı anahtarı, renk (mor/yeşil/krem), yer (sağ üst + alt / yalnız sağ üst / yalnız alt), canlı önizleme; kiosk en geç 15 sn'de alır. 10 sn'de bir yeniler. Muhasebe ve İK bilerek yok. Henüz giriş (şifre) yok — yalnızca market içi ağda çalıştır. |
| `apps/server` | Bağımlılıksız Node HTTP API: `GET/POST /api/products`, `PUT/DELETE /api/products/:barcode`, `POST /api/checkout` (ağırlık doğrulanmazsa 409 + ret kaydı), `GET /api/sales`, `GET /api/rejects`, `GET/POST /api/ads`, `PUT/DELETE /api/ads/:id`. Veri: `apps/server/data/db.json`. |
| `apps/cart-agent` | Seri porttan gram okur, kararlılık filtresi uygular, WebSocket ile yayınlar. `--fake` modu donanımsız test içindir. Kiosk'tan `{"type":"tare"}` gelince ESP32'ye `t` yollar. |
| `firmware/esp32-scale` | Arduino sketch: HX711 → saniyede ~10 satır gram. Komutlar: `t` dara, `c1000` kalibrasyon, `f` faktör. Pinler: DT=GPIO4, SCK=GPIO5, VCC=3V3. |

## Komutlar
```bash
npm install
npm test                 # domain + server testleri
npm run dev:server       # API :3000
npm run dev              # kiosk :5173 (/api → :3000 proxy)
npm run dev:admin        # yönetim paneli :5174
npm run dev:agent:fake   # terazisiz cart-agent (terminale gram yaz)
npm run dev:agent        # gerçek ESP32 (SERIAL_PORT=/dev/ttyUSB0 ile zorlanabilir)
```

## Yol haritası (Prototip Kurulum Rehberi fazları)
- [x] Faz 0 terazi bench testi (ESP32 + HX711 + 20 kg çubuk hücre) — donanım tarafı
- [x] Yazılım simülasyonu (arayüz + backend + veritabanı mantığı)
- [x] Faz 3 barkod okuyucudan gerçek girdi (useBarcodeScanner) — yeniden kurulumda eklendi
- [x] Faz 4 terazi → Pi → kiosk köprüsü (cart-agent + useScale) — yeniden kurulumda eklendi, **gerçek donanımda henüz test edilmedi**
- [ ] Raspberry Pi 4 kurulum + Chromium kiosk autostart (bkz. docs/raspberry-pi.md)
- [ ] Mekanik montaj (Donanım Yerleşimi, yüzer sepet + sabit çerçeve)
- [x] Yönetim paneli: Genel Bakış + Ürün Girişi (`apps/admin`). Muhasebe ve İK istenmedi.
- [ ] Panel için giriş / yetki (şu an herkes ürün silebilir)
- [ ] Market içi konum (F1: BLE beacon / manuel reyon; F2: UWB), reklam, filo takibi
- [ ] Kiloyla satış — yasal metroloji tip onayı gelene kadar kapalı
- [ ] Gerçek ödeme (banka/PCI sertifikası uzun sürer, erken başlat); şu an sandbox
- [ ] Sunucu: JSON dosyası → PostgreSQL

## claude.ai'da duran belgeler (Onur'un hesabı)
Ahududu – Akıllı Market Arabası Simülasyonu · Ahududu – Akıllı Market Arabası Projesi (doküman) ·
Prototip Kurulum Rehberi · Prototip Alışveriş Listesi · Terazi Bench Testi ·
Ahududu Donanım Listesi · Ahududu Donanım Yerleşimi · Ahududu Logo · Ahududu · Simülasyondan Sahaya

## Kurallar
- Ağırlık/fiyat kuralı değişirse önce `packages/domain`'de değiştir ve test ekle; kiosk ve server oradan okur.
- Arayüz metinleri Türkçe.
