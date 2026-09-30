#!/usr/bin/env bash
# Chromium'u kiosk (tam ekran) modunda açar. Masaüstü açılınca otomatik çalışır (kurulum.sh ayarlar).
# Kiosk sunucusu hazır olana kadar en fazla 90 sn bekler.
CART_NO="$(cat "$HOME/.ahududu-araba" 2>/dev/null || echo 0417)"
URL="http://localhost:5173/?araba=${CART_NO}"

for _ in $(seq 1 90); do
  curl -sf -o /dev/null http://localhost:5173/ && break
  sleep 1
done

# Raspberry Pi OS sürümüne göre tarayıcının adı "chromium" ya da "chromium-browser"
BROWSER="$(command -v chromium || command -v chromium-browser)"
exec "$BROWSER" \
  --kiosk --noerrdialogs --disable-infobars --incognito \
  --autoplay-policy=no-user-gesture-required \
  --check-for-update-interval=31536000 \
  "$URL"
