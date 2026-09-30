#!/usr/bin/env bash
# Ahududu — Raspberry Pi kurulumu. Depo klasöründe, normal kullanıcıyla çalıştır:
#
#   ./deploy/pi/kurulum.sh                                   # tek araba: sunucu da bu Pi'de
#   SUNUCU=http://192.168.1.20:3000 ./deploy/pi/kurulum.sh   # çok araba: sunucu market bilgisayarında
#   ARABA=0418 ./deploy/pi/kurulum.sh                        # araba numarası (varsayılan 0417)
#
# Tekrar çalıştırmak güvenlidir (var olan ayarları ikiler yapmaz). Ayrıntı: docs/raspberry-pi.md
set -euo pipefail

DIR="$(cd "$(dirname "$0")/../.." && pwd)"
USER_NAME="$(id -un)"
ARABA="${ARABA:-0417}"
SUNUCU="${SUNUCU:-}"
cd "$DIR"
say() { printf '\n\033[1;35m▸ %s\033[0m\n' "$*"; }

say "Node kontrolü"
if ! command -v node >/dev/null || ! node -e "require('node:sqlite')" 2>/dev/null; then
  echo "Node.js 22.13 veya üstü gerekli (veritabanı için). Kurmak için:"
  echo "  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt install -y nodejs"
  exit 1
fi
node -v

say "Paketler (npm install)"
npm install --no-fund --no-audit

say "Kiosk derleniyor"
if [ -n "$SUNUCU" ]; then
  VITE_API_URL="${SUNUCU%/}/api" npm run build -w @ahududu/kiosk
else
  npm run build -w @ahududu/kiosk
fi

say "Servisler (açılışta otomatik başlar, çökerse yeniden başlar)"
SERVICES="ahududu-agent ahududu-kiosk"
[ -z "$SUNUCU" ] && SERVICES="ahududu-server $SERVICES"
for s in $SERVICES; do
  sed -e "s#__USER__#${USER_NAME}#g" -e "s#__DIR__#${DIR}#g" "deploy/pi/$s.service" | sudo tee "/etc/systemd/system/$s.service" >/dev/null
done
sudo systemctl daemon-reload
# shellcheck disable=SC2086
sudo systemctl enable --now $SERVICES

say "Seri port izni (ESP32 için)"
sudo usermod -aG dialout "$USER_NAME"

say "Ekran kararması kapatılıyor"
sudo raspi-config nonint do_blanking 1 || echo "(raspi-config bulunamadı, elle kapatın)"

say "Araba numarası: $ARABA"
echo "$ARABA" > "$HOME/.ahududu-araba"

say "Kiosk tarayıcısı masaüstüyle otomatik açılacak"
chmod +x deploy/pi/kiosk.sh deploy/pi/guncelle.sh
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/ahududu-kiosk.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Ahududu Kiosk
Exec=${DIR}/deploy/pi/kiosk.sh
X-GNOME-Autostart-enabled=true
EOF

if [ -z "$SUNUCU" ]; then
  say "Her gece 03:00'te veritabanı yedeği"
  LINE="0 3 * * * cd ${DIR} && /usr/bin/npm run db:yedek --silent >> ${HOME}/ahududu-yedek.log 2>&1"
  # Pi'de hiç zamanlanmış görev yoksa crontab -l hata verir; set -e yüzünden adımın yarıda kalmaması için || true
  ( (crontab -l 2>/dev/null || true) | (grep -v 'npm run db:yedek' || true); echo "$LINE" ) | crontab -
fi

say "Bitti"
systemctl --no-pager --lines=0 status $SERVICES || true
echo
echo "Yeniden başlatın: sudo reboot  → açılışta kiosk tam ekran gelir."
echo "Güncelleme: ./deploy/pi/guncelle.sh"
