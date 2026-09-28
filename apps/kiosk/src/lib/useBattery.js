// Şarj durumu: tarayıcının Battery API'si (Chromium). Pil yoksa / desteklenmiyorsa null.
// Gerçek arabada pil ölçümü cart-agent'tan gelecek (BMS / gerilim bölücü) — o zaman buraya bağlanır.
import { useEffect, useState } from "react";

export function useBattery() {
  const [battery, setBattery] = useState(null);
  useEffect(() => {
    let b, stop = false;
    const read = () => !stop && setBattery({ level: b.level, charging: b.charging });
    navigator.getBattery?.().then((bat) => {
      b = bat; read();
      b.addEventListener("levelchange", read);
      b.addEventListener("chargingchange", read);
    }).catch(() => {});
    return () => {
      stop = true;
      b?.removeEventListener("levelchange", read);
      b?.removeEventListener("chargingchange", read);
    };
  }, []);
  return battery;
}
