import { useMemo, useState } from "react";
import api, { apiMessage } from "../api/client";
import { useApi } from "../hooks/useApi";
import { Loader, ErrorAlert, EmptyState } from "../components/Ui";
import { money } from "../utils/format";

// RF-13: punto de venta con carrito, validación de stock de la tienda y pago simulado.
// El total y el vuelto se muestran aquí, pero la decisión final es siempre del servidor.
export default function Sell() {
  const [storeId, setStoreId] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]); // [{ product, quantity, available }]
  const [method, setMethod] = useState("efectivo");
  const [paidWith, setPaidWith] = useState("");
  const [feedback, setFeedback] = useState({ ok: "", error: "" });
  const [sending, setSending] = useState(false);

  const locations = useApi(() => api.get("/api/locations"));
  const stores = useMemo(() => locations.data?.filter((l) => l.type === "tienda") ?? [], [locations.data]);
  const activeStore = storeId || stores[0]?._id || "";

  const stocks = useApi(
    () => (activeStore ? api.get("/api/stocks", { params: { locationId: activeStore } }) : Promise.resolve({ data: [] })),
    [activeStore]
  );

  const catalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (stocks.data ?? [])
      .filter((s) => s.product)
      .filter((s) => !term || s.product.name.toLowerCase().includes(term) || s.product.sku.toLowerCase().includes(term));
  }, [stocks.data, search]);

  const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const change = method === "efectivo" && paidWith !== "" ? Number(paidWith) - total : 0;

  const addToCart = (stockRow) => {
    setCart((prev) => {
      const found = prev.find((i) => i.product._id === stockRow.product._id);
      if (found) {
        return prev.map((i) =>
          i.product._id === stockRow.product._id
            ? { ...i, quantity: Math.min(i.quantity + 1, stockRow.quantity) }
            : i
        );
      }
      return [...prev, { product: stockRow.product, quantity: 1, available: stockRow.quantity }];
    });
  };

  const changeQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product._id === productId
            ? { ...i, quantity: Math.min(Math.max(i.quantity + delta, 0), i.available) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const submitSale = async () => {
    setSending(true);
    setFeedback({ ok: "", error: "" });
    try {
      await api.post("/api/sales", {
        locationId: activeStore,
        items: cart.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
        payment: { method, paidWith: method === "efectivo" ? Number(paidWith) : undefined },
      });
      setFeedback({ ok: `Venta cobrada: ${money(total)}`, error: "" });
      setCart([]);
      setPaidWith("");
      stocks.refresh();
    } catch (err) {
      setFeedback({ ok: "", error: apiMessage(err) });
    } finally {
      setSending(false);
    }
  };

  const canCharge =
    cart.length > 0 && activeStore && (method === "billetera" || (paidWith !== "" && Number(paidWith) >= total));

  if (locations.loading) return <Loader />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h1 className="mb-0">Nueva venta</h1>
        <select
          className="form-select w-auto fw-bold"
          value={activeStore}
          onChange={(e) => { setStoreId(e.target.value); setCart([]); }}
        >
          {stores.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      </div>
      {stores.length === 0 && <ErrorAlert message="No hay tiendas registradas: crea una en Ubicaciones." />}
      {feedback.ok && <div className="alert alert-success py-2">{feedback.ok}</div>}
      <ErrorAlert message={feedback.error} />

      <div className="row g-3">
        <div className="col-lg-7">
          <input
            className="form-control mb-2"
            placeholder="Buscar producto para agregar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {stocks.loading ? (
            <Loader />
          ) : (
            <div className="row g-2">
              {catalog.map((s) => (
                <div key={s._id} className="col-6 col-md-4">
                  <button
                    className="glass p-2 w-100 text-start border-0"
                    onClick={() => addToCart(s)}
                    disabled={s.quantity === 0}
                    style={{ opacity: s.quantity === 0 ? 0.5 : 1 }}
                  >
                    <div className="fw-bold" style={{ fontSize: "0.85rem" }}>{s.product.name}</div>
                    <div className="text-muted-2" style={{ fontSize: "0.74rem" }}>
                      Stock tienda: {s.quantity}{s.quantity <= s.minStock ? " ⚠" : ""}
                    </div>
                    <div className="fw-bold mt-1">{money(s.product.price)}</div>
                  </button>
                </div>
              ))}
              {catalog.length === 0 && (
                <div className="col-12"><EmptyState>Sin productos con stock en esta tienda.</EmptyState></div>
              )}
            </div>
          )}
        </div>

        <div className="col-lg-5">
          <div className="glass p-3">
            <h2 className="fs-5">Carrito · {cart.length} productos</h2>
            {cart.length === 0 && <EmptyState>Toca un producto del catálogo para agregarlo.</EmptyState>}
            {cart.map((i) => (
              <div key={i.product._id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div style={{ minWidth: 0 }}>
                  <div className="fw-bold text-truncate">{i.product.name}</div>
                  <div className="text-muted-2" style={{ fontSize: "0.78rem" }}>{money(i.product.price)} c/u</div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => changeQty(i.product._id, -1)}>−</button>
                  <strong>{i.quantity}</strong>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => changeQty(i.product._id, 1)}>+</button>
                  <strong style={{ width: 70, textAlign: "right" }}>{money(i.product.price * i.quantity)}</strong>
                </div>
              </div>
            ))}

            <div className="d-flex justify-content-between align-items-center mt-3">
              <h2 className="fs-5 mb-0">Total</h2>
              <span className="ls-display fw-bold fs-3"><span className="hl">{money(total)}</span></span>
            </div>
            <div className="btn-group w-100 my-3">
              <button
                className={`btn ${method === "efectivo" ? "btn-ink" : "btn-outline-secondary"}`}
                onClick={() => setMethod("efectivo")}
              >
                💵 Efectivo
              </button>
              <button
                className={`btn ${method === "billetera" ? "btn-ink" : "btn-outline-secondary"}`}
                onClick={() => setMethod("billetera")}
              >
                📱 Billetera digital
              </button>
            </div>
            {method === "efectivo" && (
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label fw-bold small mb-1">PAGA CON</label>
                  <input
                    type="number"
                    min="0"
                    step="0.10"
                    className="form-control"
                    value={paidWith}
                    onChange={(e) => setPaidWith(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-bold small mb-1">VUELTO</label>
                  <div className="ls-display fw-bold fs-4" style={{ color: change >= 0 ? "var(--ls-green)" : "var(--ls-red)" }}>
                    {money(Math.max(change, 0))}
                  </div>
                </div>
              </div>
            )}
            <button className="btn btn-ink w-100" disabled={!canCharge || sending} onClick={submitSale}>
              {sending ? "Cobrando…" : `Cobrar ${money(total)}`}
            </button>
            <p className="text-center text-muted-2 mt-2 mb-0" style={{ fontSize: "0.72rem" }}>
              Pago simulado · sin comprobante
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
