import React, { useCallback, useEffect, useState } from "react";
import { api } from "./lib/api.js";
import Logo from "./components/Logo.jsx";
import Overview from "./components/Overview.jsx";
import Products from "./components/Products.jsx";

const TABS = [["overview", "Genel Bakış"], ["products", "Ürün Girişi"]];

export default function App() {
  const [tab, setTab] = useState(() => (location.hash === "#urunler" ? "products" : "overview"));
  const [data, setData] = useState({ products: [], sales: [], rejects: [] });
  const [online, setOnline] = useState(null); // null: ilk yükleme
  const [updated, setUpdated] = useState(null);
  const [toast, setToast] = useState("");

  const say = useCallback((m) => { setToast(m); clearTimeout(say.t); say.t = setTimeout(() => setToast(""), 2600); }, []);
  const refresh = useCallback(async () => {
    try {
      const [products, sales, rejects] = await Promise.all([api.products(), api.sales(), api.rejects()]);
      setData({ products, sales, rejects }); setOnline(true); setUpdated(new Date());
    } catch { setOnline(false); }
  }, []);
  // Arabalardan gelen satışlar için 10 sn'de bir yenile
  useEffect(() => { refresh(); const id = setInterval(refresh, 10000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => { history.replaceState(null, "", tab === "products" ? "#urunler" : "#"); }, [tab]);

  async function save(p, isEdit) {
    try {
      await (isEdit ? api.updateProduct(p) : api.addProduct(p));
      await refresh(); say(p.name + (isEdit ? " güncellendi" : " eklendi"));
      return true;
    } catch (e) { return e.message; }
  }
  async function remove(p) {
    if (!confirm(`${p.name} silinsin mi? Arabalar bu barkodu artık tanımaz.`)) return;
    try { await api.deleteProduct(p.barcode); await refresh(); say(p.name + " silindi"); }
    catch (e) { say(e.message); }
  }

  return (
    <div className="app">
      <header className="bar">
        <div className="brand"><Logo /><b>Ahududu</b><small>YÖNETİM</small></div>
        <nav role="tablist" aria-label="Bölümler">
          {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
        </nav>
        <span className={"dot" + (online ? " on" : "")}>
          {online === false ? "Sunucuya ulaşılamıyor" : updated ? "Güncel · " + updated.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Yükleniyor…"}
        </span>
      </header>
      {online === false && <div className="alert" role="alert">Sunucu kapalı. <code>npm run dev:server</code> ile başlatın; panel 10 saniyede bir yeniden dener.</div>}
      <main>
        {tab === "overview"
          ? <Overview {...data} />
          : <Products products={data.products} sales={data.sales} onSave={save} onDelete={remove} />}
      </main>
      <div id="toast" className={toast ? "on" : ""} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
