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
| `packages/domain/src/catalog.js` | **Temsili katalog** (Onur Migros'un tamamını istedi; site verisi kopyalanamadığı için bilinen markalarla ≈190 ürünlük örnek katalog seçildi): 12 reyon (`AISLES`), `DEFAULT_PRODUCTS` (marka, fiyat ≈, brüt ağırlık ≈, simge, reyon), markalı `DEFAULT_ADS` (etiketsiz — Onur'un tercihi; markalarla gerçek anlaşma yok, yalnızca demo). Bütün demo barkodlar GS1 "20" mağaza içi önekli geçerli EAN-13 (gerçek ürün barkoduyla çakışmaz): Mark I'in 8 ürünü `2000001…` (eski 869… barkodlarının kontrol hanesi geçersizdi; katalog sürüm 3'te taşındı, `BARCODE_RENAMES`), diğerleri `2000000…`. `CATALOG_VERSION` artınca sunucu açılışta `db.json`'u bir kez taşır (`store.migrate`, testli): v2 yeni ürün/reklamları ekler, v3 eski barkodları ürünlerde ve satış geçmişinde çevirir; kullanıcının eklediği/sildiği kayıtlara dokunmaz. v3 öncesi yedek: `apps/server/data/db.yedek-surum2.json` (git dışında). |
| `packages/domain` | Ortak iş kuralları: sepet, beklenen ağırlık, tolerans (max 25 g, %3), doğrulama, ürün validasyonu, satış özeti ve saatlik/günlük kovalar (panel). `@ahududu/domain/logo`: logo geometrisi. Testli. |
| `apps/kiosk` | React + Vite arayüz, **Mark I görünümü** (eski projenin videolarından birebir): mor üst bar "Ahududu · ARABA #0417", Karşılama → Alışveriş (solda raf + Güvenlik testi, sağda Sepetim + Ağırlık doğrulama) → Ödeme tamamlandı. Açılışta ~2,6 sn splash (`Splash.jsx`: taneler ortada buluşup logoyu kurar, "Ahududu" + mor el yazısı "alışverişin en kolay hali" (Caveat), açılış tonu `sound.intro()`; ürün eklenince tatlı "di-ding" (`sound.scan`), okutulmamış üründe yumuşak inen iki nota (`sound.warn`, sert vızıltı değil — Onur istedi); Pi'de ses için Chromium `--autoplay-policy=no-user-gesture-required`). Raf: reyon sekmeleri + arama (katalog büyük). Krem zemin, koyu yeşil eylem düğmeleri (#2E6A4C, taç #173B2F), fiyat/ağırlık mono yazı (Sora + IBM Plex Mono). Logo ve palet claude.ai'daki "Ahududu Logo" kitinden (`components/Logo.jsx`: dokuz damla + yeşil taç); mor #6A2C9E. Kiosk'ta **Sistem sekmesi yok** (Onur kaldırttı): ürün / satış / reklam yönetimi yalnızca `apps/admin`'de; kiosk API'den yalnızca ürün + reklam okur ve ödeme gönderir. Terazi dara komutu (`useScale().tare`) şu an arayüzde bağlı değil. Reklam alanları (`AdSlot.jsx`, 8 sn'de bir döner; reklamlar sunucudan `GET /api/ads`, panelden yönetilir, sunucu kapalıyken `DEFAULT_ADS`): **Ürün bul** (raf başlığındaki düğme → `Finder.jsx`, tam sayfa, reklamsız): ürün ara ya da reyon/rafa dokun → hedef raf yanar, "Buradasınız"dan (son okutulan reyon, yoksa giriş) oraya koridorlardan geçen hareketli mor çizgi + yaklaşık metre. Kroki geometrisi ve rota `packages/domain/src/storemap.js` (`STORE_MAP`, `route`, testli: dik açılı, raf içinden geçmez); panel Arabalar sekmesi aynı krokide arabaları gösterir. "Yeni alışveriş başlat" → açılış animasyonu yeniden + karşılama ekranı. Reklamlar **yalnızca alışveriş ekranında** sağ üstte (sepetin üstünde) ve altta bant; karşılama, ödeme ve ödeme-tamamlandı ekranlarında reklam yok (Onur istemedi). "Ödemeye geç" → tam sayfa ödeme (`Checkout.jsx`: sipariş özeti + kart / QR, "Sepete dön"; ağırlık bozulursa yöntemler kapanır). Dar ekranda sağ reklam gizlenir, sepet raftan hemen sonra gelir. Barkod okuyucuyu klavye olayı olarak yakalar (USB-HID). cart-agent'a WebSocket ile bağlanır; bağlı değilse terazi simülasyonuna düşer. Sunucu kapalıysa çevrimdışı yerel katalogla çalışır. |
| `apps/admin` | Yönetim paneli (React + Vite, :5174). **Arabalar** (3 sn'de bir yenilenir): özet (araba, alışverişte, ödemede, okutulmamış ürün, düşük şarj, bağlantı yok), market haritası (Giriş · Reyon 1–5 · Kasa), araba kartları (aşama, şarj, konum, ürün adedi, tutar, ağırlık, terazi, son sinyal). Kiosk durumu 5 sn'de bir ve her değişiklikte `POST /api/carts/:no` ile bildirir; 20 sn haber gelmezse "bağlantı yok". Şarj = tarayıcı Battery API (Pi'de pil yok → "bilinmiyor"; ileride cart-agent/BMS). Konum = son okutulan ürünün reyonu (F1 yaklaşımı; BLE beacon gelince değişecek). İkinci arabayı denemek: `http://localhost:5173/?araba=0418`. **Genel Bakış**: dönem filtresi (bugün / 7 / 30 gün), ciro, satış, ortalama sepet, satılan ürün, ağırlık reddi; saatlik/günlük ciro grafiği; en çok satanlar; son satışlar; ret listesi. **Ürün Girişi**: ekle / düzenle (barkod kilitli) / sil / ara. **Reklamlar**: ekle / düzenle / sil, yayında-kapalı anahtarı, renk (mor/yeşil/krem), yer (sağ üst + alt / yalnız sağ üst / yalnız alt), canlı önizleme; kiosk en geç 15 sn'de alır. 10 sn'de bir yeniler. Muhasebe ve İK bilerek yok. Henüz giriş (şifre) yok — yalnızca market içi ağda çalıştır. |
| `apps/server` | Bağımlılıksız Node HTTP API: `GET/POST /api/products`, `PUT/DELETE /api/products/:barcode`, `POST /api/checkout` (ağırlık doğrulanmazsa 409 + ret kaydı), `GET /api/sales`, `GET /api/rejects`, `GET/POST /api/ads`, `PUT/DELETE /api/ads/:id`, `GET /api/carts`, `POST /api/carts/:no` (araba durumu, bellekte). Ürünlerde `aisle` (reyon no, `AISLES` domain'de). `GET /api/health` veritabanı sayılarını da döner. |
| **Veritabanı** | **SQLite** (Onur seçti; Node'un yerleşik `node:sqlite`, ek kütüphane yok, Node ≥ 22.13) — `apps/server/src/db.js`, dosya `apps/server/data/ahududu.db` (WAL). Tablolar: `products`, `ads`, `sales` + `sale_items` (satış anındaki ad/fiyat, ürün silinse de geçmiş kalır), `rejects`, `meta` (fiş sırası `sale_seq`, `catalog_version`). **Para kuruş tam sayı** (`*_kurus`), API TL döner. Şema adımları `SCHEMA` dizisi + `PRAGMA user_version` — şema değişince sona adım ekle, eskisini değiştirme. İlk açılışta eski `data/db.json` varsa bir kez aktarılır (`legacy-json.js`; JSON'a dokunulmaz). Yedek: `npm run db:yedek` → `data/yedek/ahududu-TARIH_SAAT.db` (sunucu çalışırken de olur). Veritabanı, yedekler ve JSON git'e girmez. Araba durumları veritabanına yazılmaz (bellekte). İleride çok market / bulut → PostgreSQL (depo arayüzü `openStore()` aynı kalacak şekilde). |
| `apps/cart-agent` | Seri porttan gram okur, kararlılık filtresi uygular, WebSocket ile yayınlar. `--fake` modu donanımsız test içindir. Kiosk'tan `{"type":"tare"}` gelince ESP32'ye `t` yollar. |
| `firmware/esp32-scale` | Arduino sketch: HX711 → saniyede ~10 satır gram. Komutlar: `t` dara, `c1000` kalibrasyon, `f` faktör. Pinler: DT=GPIO4, SCK=GPIO5, VCC=3V3. |

## Komutlar
```bash
npm install
npm test                 # domain + server testleri
npm run db:yedek         # veritabanı yedeği (apps/server/data/yedek/)
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
- [ ] Raspberry Pi 4 kurulum + Chromium kiosk autostart — **betikler hazır, donanımda denenmedi**: `docs/raspberry-pi.md` (Windows'tan Imager + SSH, Linux'a geçmek gerekmez), `deploy/pi/kurulum.sh` (servisler: ahududu-server/agent/kiosk, Chromium autostart, gece 03:00 yedek; `SUNUCU=` ile çok araba, `ARABA=` numara), `deploy/pi/guncelle.sh`. Pi'de kiosk derlenmiş haliyle (`vite preview`, :5173) çalışır. Mark I'de BIOS bozulmuştu (Pi kurulumuyla ilgisi yok, muhtemelen otomatik BIOS güncellemesi / elektrik) — kod GitHub'da, yedekler cihaz dışına kopyalanmalı.
- [ ] Mekanik montaj (Donanım Yerleşimi, yüzer sepet + sabit çerçeve)
- [x] Yönetim paneli: Genel Bakış + Ürün Girişi (`apps/admin`). Muhasebe ve İK istenmedi.
- [ ] Panel için giriş / yetki (şu an herkes ürün silebilir)
- [ ] Market içi konum (F1: BLE beacon / manuel reyon; F2: UWB), reklam, filo takibi
- [ ] Kiloyla satış — yasal metroloji tip onayı gelene kadar kapalı
- [ ] Gerçek ödeme (banka/PCI sertifikası uzun sürer, erken başlat); şu an sandbox
- [x] Sunucu: JSON dosyası → veritabanı (SQLite, Eylül 2026)
- [ ] Çok market / bulut gerekirse SQLite → PostgreSQL

## claude.ai'da duran belgeler (Onur'un hesabı)
Ahududu – Akıllı Market Arabası Simülasyonu · Ahududu – Akıllı Market Arabası Projesi (doküman) ·
Prototip Kurulum Rehberi · Prototip Alışveriş Listesi · Terazi Bench Testi ·
Ahududu Donanım Listesi · Ahududu Donanım Yerleşimi · Ahududu Logo · Ahududu · Simülasyondan Sahaya

## Kurallar
- Ağırlık/fiyat kuralı değişirse önce `packages/domain`'de değiştir ve test ekle; kiosk ve server oradan okur.
- Arayüz metinleri Türkçe.
