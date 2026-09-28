// USB-HID barkod okuyucu klavye gibi yazar: hızlı rakam dizisi + Enter.
// İnsan yazışını ayırmak için tuşlar arası süre sınırı kullanılır.
import { useEffect, useRef } from "react";

export function useBarcodeScanner(onScan, { maxGapMs = 50, minLength = 6 } = {}) {
  const buf = useRef("");
  const last = useRef(0);
  const cb = useRef(onScan);
  cb.current = onScan;

  useEffect(() => {
    function onKey(e) {
      const el = e.target;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return; // form alanlarına karışma
      const now = performance.now();
      if (now - last.current > maxGapMs) buf.current = "";
      last.current = now;
      if (e.key === "Enter") {
        if (buf.current.length >= minLength) { cb.current(buf.current); e.preventDefault(); }
        buf.current = "";
      } else if (/^\d$/.test(e.key)) {
        buf.current += e.key;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maxGapMs, minLength]);
}
