import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PRODUCTS, DEFAULT_ADS, addToCart, removeFromCart, cartTotal, expectedWeight,
  verifyWeight, canCheckout, findProduct, adsFor,
} from "@ahududu/domain";
import { api } from "./lib/api.js";
import { useScale } from "./lib/useScale.js";
import { useBarcodeScanner } from "./lib/useBarcodeScanner.js";
import { sound } from "./lib/sound.js";
import Welcome from "./components/Welcome.jsx";
import Shelf from "./components/Shelf.jsx";
import CartScreen from "./components/CartScreen.jsx";
import Done from "./components/Done.jsx";
import PaySheet from "./components/PaySheet.jsx";
import Logo from "./components/Logo.jsx";
import Splash from "./components/Splash.jsx";
import AdSlot from "./components/AdSlot.jsx";

const CART_NO = import.meta.env.VITE_CART_NO || "0417";
const jitter = (w) => w * (1 + (Math.random() - 0.5) * 0.02);

// Kiosk yalnızca müşteri ekranlarını içerir. Ürün, satış ve reklam yönetimi apps/admin'de.
export default function App() {
  const [screen, setScreen] = useState("welcome"); // welcome | shop
  const [online, setOnline] = useState(false);
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [ads, setAds] = useState(DEFAULT_ADS); // sunucu kapalıyken varsayılan reklamlar
  const [pay, setPay] = useState(null);
  const [toast, setToast] = useState("");
  const [splash, setSplash] = useState(true);
  const endSplash = useCallback(() => setSplash(false), []);
  const scale = useScale();

  const say = useCallback((msg) => { setToast(msg); clearTimeout(say.t); say.t = setTimeout(() => setToast(""), 2600); }, []);

  // Sunucudan katalog + reklamlar (panelde yapılan değişiklik en geç 15 sn'de arabaya yansır)
  const refresh = useCallback(async () => {
    try {
      // reklamlar alınamazsa (ör. eski sunucu) alışveriş yine çevrimiçi çalışır, eldeki reklamlar kalır
      const [p, a] = await Promise.all([api.products(), api.ads().catch(() => null)]);
      setProducts(p); if (a) setAds(a); setOnline(true);
    } catch { setOnline(false); }
  }, []);
  useEffect(() => { refresh(); const id = setInterval(refresh, 15000); return () => clearInterval(id); }, [refresh]);

  const measured = scale.grams;
  const verify = useMemo(() => verifyWeight(cart, products, measured), [cart, products, measured]);
  const prevKind = React.useRef(verify.kind);
  useEffect(() => {
    if (verify.kind !== prevKind.current) {
      if (verify.kind === "bad") sound.warn();
      if (verify.kind === "ok" && cart.length) sound.ok();
      prevKind.current = verify.kind;
    }
  }, [verify.kind, cart.length]);

  const scan = useCallback((bc) => {
    const p = findProduct(products, bc);
    if (!p) { sound.warn(); say("Bu barkod veritabanında yok: " + bc); return false; }
    setCart((c) => addToCart(c, bc));
    setScreen("shop");
    sound.scan(); say(p.name + " sepete eklendi");
    return true;
  }, [products, say]);
  useBarcodeScanner(scan);

  // Raftan ürün: okut; terazi yoksa arabaya bırakmayı da simüle et
  const pick = (p) => { if (scan(p.barcode) && !scale.connected) scale.simAdd(jitter(p.weight)); };
  const dec = (bc) => {
    const p = findProduct(products, bc);
    setCart((c) => removeFromCart(c, bc));
    if (!scale.connected && p) scale.simAdd(-jitter(p.weight));
  };
  const sneak = () => scale.simAdd(jitter(products[Math.floor(Math.random() * products.length)].weight));
  const clearExtra = () => { if (verify.kind === "bad") scale.simAdd(-verify.diff); };

  async function checkout(method) {
    setPay({ stage: "processing", method });
    await new Promise((r) => setTimeout(r, 1200)); // ödeme terminali gecikmesi (sandbox)
    let sale = null;
    if (online) {
      try { sale = await api.checkout({ cart, measured, method, cartId: "cart-" + CART_NO }); }
      catch { /* 409: ağırlık doğrulanmadı — aşağıda reddedilir */ }
    } else if (canCheckout(cart, products, measured)) {
      sale = {
        id: "L-" + Date.now().toString().slice(-6), time: new Date().toISOString(), method,
        total: cartTotal(cart, products),
        items: cart.map((i) => ({ ...i, name: findProduct(products, i.barcode).name, price: findProduct(products, i.barcode).price })),
      };
    }
    if (!sale) { setPay(null); sound.warn(); say("Ödeme reddedildi: ağırlık doğrulanmadı."); return; }
    sound.ok();
    setCart([]); scale.simReset();
    setPay({ stage: "done", sale });
  }

  const done = pay?.stage === "done";
  const shopping = !done && screen === "shop";

  return (
    <div className="app">
      <header className="bar">
        <button className="brand" onClick={() => { if (!done) setScreen(cart.length ? "shop" : "welcome"); }} aria-label="Ana ekran">
          <Logo size={22} berry="#FAF8F3" leaf="#B9FFDF" /><b>Ahududu</b><small>ARABA #{CART_NO}</small>
        </button>
        <div className="right">
          <span className={"dot " + (online ? "on" : "")} title={online ? "Sunucu bağlı" : "Çevrimdışı"}>{online ? "Sunucu" : "Çevrimdışı"}</span>
          <span className={"dot " + (scale.connected ? "on" : "")} title={scale.connected ? "Terazi bağlı" : "Terazi simülasyonu"}>{scale.connected ? "Terazi" : "Simülasyon"}</span>
        </div>
      </header>
      {shopping && verify.kind === "bad" && (
        <div className="alert" role="alert">Sepete okutulmadan bir ürün eklendi</div>
      )}
      {!shopping && !done ? (
        <Welcome cartNo={CART_NO} onStart={() => setScreen("shop")} say={say} />
      ) : (
        // Müşteri ekranları: solda içerik + altta reklam bandı, sağda üstte reklam (alışverişte altında sepet)
        <div className="stage">
          <div className="stage-main">
            {done
              ? <Done sale={pay.sale} onNew={() => { setPay(null); setScreen("shop"); }} />
              : (
                <main className="shop">
                  <Shelf products={products} scaleConnected={scale.connected} onPick={pick}
                    onSneak={sneak} onClearExtra={clearExtra} extra={verify.kind === "bad" ? verify.diff : 0} />
                </main>
              )}
            <AdSlot variant="bottom" ads={adsFor(ads, "bottom")} offset={Math.ceil(adsFor(ads, "bottom").length / 2)} />
          </div>
          <div className="stage-side">
            <AdSlot variant="side" ads={adsFor(ads, "side")} offset={0} />
            {shopping && (
              <CartScreen cart={cart} products={products} verify={verify} total={cartTotal(cart, products)}
                expected={expectedWeight(cart, products)} measured={measured} stable={scale.stable}
                canPay={canCheckout(cart, products, measured)} onDec={dec} onPay={() => setPay({ stage: "choose" })} />
            )}
          </div>
        </div>
      )}
      <PaySheet pay={pay} total={cartTotal(cart, products)} onMethod={checkout} onClose={() => setPay(null)} />
      <div id="toast" className={toast ? "on" : ""} role="status" aria-live="polite">{toast}</div>
      {splash && <Splash onDone={endSplash} />}
    </div>
  );
}
