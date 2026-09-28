import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PRODUCTS, addToCart, removeFromCart, cartTotal, expectedWeight,
  verifyWeight, canCheckout, findProduct, validateProduct,
} from "@ahududu/domain";
import { api } from "./lib/api.js";
import { useScale } from "./lib/useScale.js";
import { useBarcodeScanner } from "./lib/useBarcodeScanner.js";
import { sound } from "./lib/sound.js";
import Welcome from "./components/Welcome.jsx";
import Shelf from "./components/Shelf.jsx";
import CartScreen from "./components/CartScreen.jsx";
import Done from "./components/Done.jsx";
import SensorPanel from "./components/SensorPanel.jsx";
import SystemView from "./components/SystemView.jsx";
import PaySheet from "./components/PaySheet.jsx";
import Logo from "./components/Logo.jsx";

const CART_NO = import.meta.env.VITE_CART_NO || "0417";
const jitter = (w) => w * (1 + (Math.random() - 0.5) * 0.02);

export default function App() {
  const [screen, setScreen] = useState("welcome"); // welcome | shop | sys
  const [online, setOnline] = useState(false);
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [sales, setSales] = useState([]);
  const [log, setLog] = useState([]);
  const [pay, setPay] = useState(null);
  const [toast, setToast] = useState("");
  const scale = useScale();

  const addLog = (m, path, code, note) =>
    setLog((l) => [{ t: new Date().toLocaleTimeString("tr-TR"), m, path, code, note }, ...l].slice(0, 60));
  const say = useCallback((msg) => { setToast(msg); clearTimeout(say.t); say.t = setTimeout(() => setToast(""), 2600); }, []);

  // Sunucudan katalog + satışlar
  const refresh = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api.products(), api.sales()]);
      setProducts(p); setSales(s); setOnline(true);
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
    if (!p) { addLog("POST", "/cart/items", 404, "Bilinmeyen barkod " + bc); sound.warn(); say("Bu barkod veritabanında yok: " + bc); return false; }
    setCart((c) => addToCart(c, bc));
    setScreen((s) => (s === "welcome" ? "shop" : s));
    addLog("POST", "/cart/items", 201, p.name + " sepete eklendi");
    sound.scan(); say(p.name + " sepete eklendi");
    return true;
  }, [products, say]);
  useBarcodeScanner(scan);

  const simWeight = (delta, note) => {
    scale.simAdd(delta);
    addLog("PUT", "/cart/weight", 200, note + ": " + (delta > 0 ? "+" : "") + Math.round(delta) + " g");
  };

  // Raftan ürün: okut; terazi yoksa arabaya bırakmayı da simüle et
  const pick = (p) => { if (scan(p.barcode) && !scale.connected) simWeight(jitter(p.weight), p.name + " bırakıldı"); };
  const dec = (bc) => {
    const p = findProduct(products, bc);
    setCart((c) => removeFromCart(c, bc));
    if (!scale.connected && p) simWeight(-jitter(p.weight), p.name + " çıkarıldı");
    addLog("DELETE", "/cart/items/" + bc, 200, (p?.name || bc) + " azaltıldı");
  };
  const sneak = () => {
    const p = products[Math.floor(Math.random() * products.length)];
    simWeight(jitter(p.weight), "Okutulmadan bırakıldı (" + p.name + ")");
  };
  const clearExtra = () => { if (verify.kind === "bad") simWeight(-verify.diff, "Okutulmayan ürün çıkarıldı"); };

  async function checkout(method) {
    setPay({ stage: "processing", method });
    await new Promise((r) => setTimeout(r, 1200)); // ödeme terminali gecikmesi (sandbox)
    const payload = { cart, measured, method, cartId: "cart-" + CART_NO };
    let sale = null;
    if (online) {
      try { sale = await api.checkout(payload); }
      catch (e) { addLog("POST", "/checkout", e.status || 500, e.message); }
    } else if (canCheckout(cart, products, measured)) {
      sale = {
        id: "L-" + Date.now().toString().slice(-6), time: new Date().toISOString(), method,
        total: cartTotal(cart, products),
        items: cart.map((i) => ({ ...i, name: findProduct(products, i.barcode).name, price: findProduct(products, i.barcode).price })),
      };
      setSales((s) => [sale, ...s]);
    }
    if (!sale) { setPay(null); sound.warn(); say("Ödeme reddedildi: ağırlık doğrulanmadı."); return; }
    addLog("POST", "/checkout", 201, sale.id + " · " + sale.total + " ₺ · " + method);
    sound.ok();
    setCart([]); scale.simReset();
    setPay({ stage: "done", sale });
    if (online) refresh();
  }

  async function addProduct(p) {
    const err = validateProduct(p, products);
    if (err) { say(err); return false; }
    if (online) {
      try { await api.addProduct(p); await refresh(); }
      catch (e) { say(e.message); return false; }
    } else setProducts((ps) => [...ps, p]);
    addLog("POST", "/products", 201, p.name + " eklendi"); say(p.name + " eklendi");
    return true;
  }
  async function deleteProduct(bc) {
    if (cart.some((i) => i.barcode === bc)) { say("Ürün sepette, önce sepetten çıkar."); return; }
    if (online) { try { await api.deleteProduct(bc); await refresh(); } catch (e) { say(e.message); return; } }
    else setProducts((ps) => ps.filter((p) => p.barcode !== bc));
    addLog("DELETE", "/products/" + bc, 200, "Ürün silindi");
  }

  const done = pay?.stage === "done" && screen !== "sys";
  let body;
  if (done) body = <Done sale={pay.sale} onNew={() => { setPay(null); setScreen("shop"); }} />;
  else if (screen === "welcome") body = <Welcome cartNo={CART_NO} onStart={() => setScreen("shop")} say={say} />;
  else if (screen === "shop") body = (
    <main className="shop">
      <Shelf products={products} scaleConnected={scale.connected} onPick={pick}
        onSneak={sneak} onClearExtra={clearExtra} extra={verify.kind === "bad" ? verify.diff : 0} />
      <CartScreen cart={cart} products={products} verify={verify} total={cartTotal(cart, products)}
        expected={expectedWeight(cart, products)} measured={measured} stable={scale.stable}
        canPay={canCheckout(cart, products, measured)} onDec={dec} onPay={() => setPay({ stage: "choose" })} />
    </main>
  );
  else body = (
    <main className="sys">
      <SensorPanel products={products} scaleConnected={scale.connected} measured={measured}
        onScan={scan} onWeight={simWeight} onTare={scale.tare} say={say} />
      <SystemView products={products} sales={sales} log={log} online={online}
        onAdd={addProduct} onDelete={deleteProduct} />
    </main>
  );

  return (
    <div className="app">
      <header className="bar">
        <button className="brand" onClick={() => { if (!done) setScreen(cart.length ? "shop" : "welcome"); }} aria-label="Ana ekran">
          <Logo size={22} berry="#FAF8F3" leaf="#B9FFDF" /><b>Ahududu</b><small>ARABA #{CART_NO}</small>
        </button>
        <div className="right">
          <span className={"dot " + (online ? "on" : "")} title={online ? "Sunucu bağlı" : "Çevrimdışı"}>{online ? "Sunucu" : "Çevrimdışı"}</span>
          <span className={"dot " + (scale.connected ? "on" : "")} title={scale.connected ? "Terazi bağlı" : "Terazi simülasyonu"}>{scale.connected ? "Terazi" : "Simülasyon"}</span>
          <button className="systab" aria-pressed={screen === "sys"} onClick={() => setScreen(screen === "sys" ? (cart.length ? "shop" : "welcome") : "sys")}>Sistem</button>
        </div>
      </header>
      {!done && screen === "shop" && verify.kind === "bad" && (
        <div className="alert" role="alert">Sepete okutulmadan bir ürün eklendi</div>
      )}
      {body}
      <PaySheet pay={pay} total={cartTotal(cart, products)} onMethod={checkout} onClose={() => setPay(null)} />
      <div id="toast" className={toast ? "on" : ""} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
