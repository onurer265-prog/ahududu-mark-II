# Raspberry Pi kurulumu (arabadaki bilgisayar)

Arabadaki Raspberry Pi 4 şunları çalıştırır: **kiosk** (dokunmatik ekran, Chromium tam ekran), **cart-agent**
(ESP32 terazisini okur) ve tek arabalı prototipte **sunucu + veritabanı**. Kod Pi'ye bilgisayardan kopyalanmaz;
Pi GitHub'dan kendisi çeker. Bilgisayarın Windows olması sorun değil, Linux'a geçmek gerekmez.

> ⚠️ Mark I dersi: kod yalnızca bir diskte kalmasın (GitHub'da ✔), veritabanı yedekleri de Pi / bilgisayar dışına kopyalansın.

## Gerekenler
- Raspberry Pi 4 (2 GB+), en az 16 GB microSD, resmi güç adaptörü
- Dokunmatik ekran (HDMI + dokunma için USB), USB barkod okuyucu
- ESP32 + HX711 terazisi (USB kablosuyla Pi'ye)
- Pi ile aynı Wi-Fi'de bir bilgisayar (Windows olur)

## 1. SD kartı hazırla (Windows'ta)
1. **Raspberry Pi Imager**'ı indir: https://www.raspberrypi.com/software
2. Cihaz: *Raspberry Pi 4* · İşletim sistemi: **Raspberry Pi OS (64-bit)** (masaüstlü olan) · Depolama: SD kart
3. "Ayarları düzenle" (OS customisation):
   - Hostname: **`ahududu`** (araba çoksa `ahududu-0418` gibi)
   - Kullanıcı adı: **`ahududu`**, bir şifre belirle (unutma)
   - Wi-Fi adı ve şifresi, ülke: TR
   - Hizmetler sekmesi: **SSH'ı aç** (şifreyle)
4. Yaz. Bittiğinde Windows **"Bu diski biçimlendirmeniz gerekiyor"** diye sorarsa **İPTAL** de —
   "Biçimlendir" dersen kurulum silinir.
5. Kartı Pi'ye tak, ekranı / okuyucuyu / ESP32'yi bağla, gücü ver. İlk açılış birkaç dakika sürer.

## 2. Pi'ye bilgisayardan bağlan
Windows'ta **PowerShell** aç (Windows 10/11'de SSH hazır gelir):

```bash
ssh ahududu@ahududu.local
```

İlk bağlantıda "yes" yaz, sonra Pi şifresini gir. `ahududu.local` bulunamazsa Pi'nin IP adresini
modemin arayüzünden bul ve `ssh ahududu@192.168.1.xx` yaz.

## 3. Sistemi güncelle ve Node kur (Pi'de)
Raspberry Pi OS'in kendi Node'u eski; veritabanı için **Node 22.13+** gerekir:

```bash
sudo apt update && sudo apt full-upgrade -y
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs git
node -v
```

`node -v` en az `v22.13` göstermeli.

## 4. Kodu indir ve kur (Pi'de)
Depo gizli olduğu için GitHub giriş ister: kullanıcı adın ve şifre yerine bir **Personal access token**
(GitHub → Settings → Developer settings → Personal access tokens → *Fine-grained*, yalnızca bu depo, *Contents: Read*).

```bash
git clone https://github.com/onurer265-prog/ahududu-mark-II.git
cd ahududu-mark-II
bash deploy/pi/kurulum.sh
```

`kurulum.sh` sırayla şunları yapar (tekrar çalıştırmak güvenli):
- paketleri kurar, kiosk'u derler
- **servisleri** kurar: `ahududu-server` (API + veritabanı), `ahududu-agent` (terazi), `ahududu-kiosk` (arayüz) —
  Pi açılınca kendiliğinden başlar, çökerse yeniden başlar
- ESP32 için seri port iznini verir, ekran kararmasını kapatır
- masaüstü açılınca **Chromium'u tam ekran** kiosk olarak açar (açılış tonu için ses izni dahil)
- her gece 03:00'te **veritabanı yedeği** alır (`apps/server/data/yedek/`)

Araba numarası varsayılan `0417`; farklıysa: `ARABA=0418 bash deploy/pi/kurulum.sh`

Sonra yeniden başlat:

```bash
sudo reboot
```

Açılışta kiosk tam ekran gelir: açılış animasyonu → "Ahududu'ya hoş geldiniz".

## 5. Kontrol
```bash
systemctl status ahududu-server ahududu-agent ahududu-kiosk   # hepsi "active (running)"
journalctl -u ahududu-agent -f                                # terazi kayıtları (Ctrl+C ile çık)
curl localhost:3000/api/health                                # veritabanı sayıları
```

- Kiosk üst barında **"Sunucu"** yeşil olmalı. **"Terazi"** yazıyorsa ESP32 bağlı, **"Simülasyon"** yazıyorsa bağlı değil.
- Terazi görünmüyorsa: `ls /dev/ttyUSB* /dev/ttyACM*` ile portu bul, `sudo systemctl edit ahududu-agent` ile
  `Environment=SERIAL_PORT=/dev/ttyUSB0` ekle, `sudo systemctl restart ahududu-agent`.
- Barkod okuyucu klavye gibi çalışır; ekstra ayar gerekmez. Kiosk ekranı açıkken okut.

## 6. Yönetim paneli (market bilgisayarında)
Panel Pi'de değil, market bilgisayarında açılır ve Pi'deki sunucuya bağlanır. Bilgisayarda (PowerShell), proje klasöründe:

```bash
$env:VITE_API_URL="http://ahududu.local:3000/api"; npm run dev:admin
```

Tarayıcıda http://localhost:5174 → Arabalar sekmesinde araba krokide görünür.

## Güncelleme
Kodda değişiklik yapıp GitHub'a gönderdikten sonra Pi'de:

```bash
cd ~/ahududu-mark-II && bash deploy/pi/guncelle.sh
```

Son sürümü çeker, kiosk'u yeniden derler, servisleri yeniden başlatır. Veritabanına dokunmaz.

## Yedekler
- Otomatik: her gece 03:00 → `~/ahududu-mark-II/apps/server/data/yedek/`
- Elle: `npm run db:yedek`
- **Pi'nin dışına kopyala** (bilgisayarda PowerShell):
  ```bash
  scp -r ahududu@ahududu.local:ahududu-mark-II/apps/server/data/yedek C:\Users\onure\Ahududu-yedek
  ```
- Geri yükleme: `sudo systemctl stop ahududu-server`, yedek dosyayı `apps/server/data/ahududu.db` adıyla kopyala, `sudo systemctl start ahududu-server`.

## Birden çok araba
Sunucu ve veritabanı **tek bir yerde** olmalı (market bilgisayarı ya da bir sunucu), arabalar ona bağlanır:
1. Market bilgisayarında sunucuyu çalıştır: `npm run dev:server` (IP'sini not et, ör. `192.168.1.20`).
2. Her arabada kurulumu sunucu adresi ve araba numarasıyla yap (Pi'de sunucu servisi kurulmaz):
   ```bash
   SUNUCU=http://192.168.1.20:3000 ARABA=0418 bash deploy/pi/kurulum.sh
   ```
3. Güncellerken de aynı adres: `SUNUCU=http://192.168.1.20:3000 bash deploy/pi/guncelle.sh`

## Bilinen sınırlar
- **Donanımda henüz denenmedi.** Betikler Raspberry Pi OS (Bookworm, 64-bit) için yazıldı; ilk kurulumda birlikte
  gidelim, çıkan sorunları düzeltiriz.
- Chromium otomatik açılmazsa (masaüstü türüne göre değişebilir): masaüstünde terminal aç, `~/ahududu-mark-II/deploy/pi/kiosk.sh` çalıştır ve bana haber ver.
- **Şarj:** Pi'nin pili olmadığı için panelde şarj "bilinmiyor" görünür; araba pili ölçümü ayrıca eklenecek.
- **Ekran klavyesi:** "Ürün bul" araması için dokunmatik klavye gerekir: `sudo apt install -y squeekboard` (Wayland masaüstü).
- API ve panelde **şifre yok**; yalnızca market içi Wi-Fi'de çalıştırın.
