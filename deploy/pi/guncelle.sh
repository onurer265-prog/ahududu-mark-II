#!/usr/bin/env bash
# GitHub'daki son sürümü çeker, kiosk'u yeniden derler, servisleri yeniden başlatır.
#   ./deploy/pi/guncelle.sh
# Çok arabalı kurulumda kurulumdaki SUNUCU adresini yine verin: SUNUCU=http://192.168.1.20:3000 ./deploy/pi/guncelle.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$DIR"

git pull --ff-only
npm install --no-fund --no-audit
if [ -n "${SUNUCU:-}" ]; then
  VITE_API_URL="${SUNUCU%/}/api" npm run build -w @ahududu/kiosk
else
  npm run build -w @ahududu/kiosk
fi

# Yalnızca kurulu olan servisleri yeniden başlat
for s in ahududu-server ahududu-agent ahududu-kiosk; do
  systemctl list-unit-files "$s.service" --no-legend | grep -q "$s" && sudo systemctl restart "$s"
done
echo "Güncellendi: $(git log -1 --format='%h %s')"
echo "Kiosk ekranını yenilemek için: sudo reboot (ya da Chromium'da F5)"
