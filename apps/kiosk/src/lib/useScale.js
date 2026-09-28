// Gerçek terazi: cart-agent'a WebSocket ile bağlanır (ws://<host>:8787).
// Bağlantı yoksa kiosk simülasyon moduna düşer ve ağırlık elle değiştirilir.
import { useEffect, useRef, useState } from "react";

const URL_ = import.meta.env.VITE_AGENT_URL || `ws://${location.hostname || "localhost"}:8787`;

export function useScale() {
  const [connected, setConnected] = useState(false);
  const [grams, setGrams] = useState(0);
  const [stable, setStable] = useState(true);
  const wsRef = useRef(null);

  useEffect(() => {
    let stop = false, timer;
    const connect = () => {
      if (stop) return;
      let ws;
      try { ws = new WebSocket(URL_); } catch { timer = setTimeout(connect, 3000); return; }
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          if (m.type === "weight") { setGrams(m.grams); setStable(!!m.stable); }
        } catch { /* yok say */ }
      };
      ws.onclose = () => { setConnected(false); wsRef.current = null; timer = setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => { stop = true; clearTimeout(timer); wsRef.current?.close(); };
  }, []);

  return {
    connected, stable,
    grams,
    /** Simülasyon: yalnızca terazi bağlı değilken */
    simAdd: (d) => { if (!connected) setGrams((g) => Math.max(0, g + d)); },
    simReset: () => { if (!connected) setGrams(0); },
    tare: () => wsRef.current?.send(JSON.stringify({ type: "tare" })),
  };
}
