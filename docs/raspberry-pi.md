# Raspberry Pi kurulumu (Prototip Kurulum Rehberi, Faz 1–2)

1. Raspberry Pi Imager → "Raspberry Pi OS (64-bit)". Gelişmiş ayarlarda kullanıcı, Wi-Fi, SSH aç.
2. Ekran: micro-HDMI + dokunmatik için USB.
3. Güncelle: `sudo apt update && sudo apt full-upgrade -y`
4. Node LTS:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt install -y nodejs git
   ```
5. Depo: `git clone <github adresin> ahududu-market && cd ahududu-market && npm install`
6. Servisler: `npm run dev:server`, `npm run dev:agent`, `npm run dev -- --host`
7. Kiosk autostart — `~/.config/autostart/ahududu-kiosk.desktop`:
   ```ini
   [Desktop Entry]
   Type=Application
   Name=Ahududu Kiosk
   Exec=chromium-browser --kiosk --incognito --noerrdialogs http://localhost:5173
   X-GNOME-Autostart-enabled=true
   ```
8. Seri port izni: `sudo usermod -aG dialout $USER` (sonra yeniden giriş). Port: `ls /dev/ttyUSB* /dev/ttyACM*`
9. Ses testi: `speaker-test -t wav -c 2`

Sonraki: servisleri systemd ile otomatik başlatmak (henüz yazılmadı).
