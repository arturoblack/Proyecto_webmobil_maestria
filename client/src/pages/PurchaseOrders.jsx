import { useState } from "react";
import api, { apiMessage } from "../api/client";
import { useApi } from "../hooks/useApi";
import { Loader, ErrorAlert, EmptyState, Modal } from "../components/Ui";
import { dateTime, ORDER_STATUS_LABELS } from "../utils/format";

const EMPTY_FORM = { supplierName: "", destinationId: "", items: [{ key: "first", productId: "", quantity: 1 }] };

// RF-11 y RF-12: pedidos a proveedor y recepción con entradas automáticas (solo administrador)
export default function PurchaseOrders() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const orders = useApi(() => api.get("/api/purchase-orders"));
  const products = useApi(() => api.get("/api/products"));
  const locations = useApi(() => api.get("/api/locations"));

  const setItem = (index, patch) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));

  const submit = async () => {
    setSending(true);
    setError("");
    try {
      await api.post("/api/purchase-orders", {
        ...form,
        items: form.items.filter((i) => i.productId).map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
      });
      setShowModal(false);
      setForm(EMPTY_FORM);
      orders.refresh();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSending(false);
    }
  };

  const act = async (id, action) => {
    setError("");
    try {
      await api.post(`/api/purchase-orders/${id}/${action}`);
      orders.refresh();
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Pedidos a proveedores</h1>
        <button className="btn btn-ink btn-sm px-3" onClick={() => setShowModal(true)}>+ Nuevo pedido</button>
      </div>
      <ErrorAlert message={error || orders.error} />
      {orders.loading && <Loader />}
      {!orders.loading && orders.data?.length === 0 && (
        <div className="glass p-4"><EmptyState>Aún no hay pedidos a proveedores.</EmptyState></div>
      )}
      {!orders.loading && orders.data?.length > 0 && (
        <div className="d-flex flex-column gap-2">
          {orders.data.map((o) => (
            <div key={o._id} className="glass p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div className="fw-bold">{o.supplierName}</div>
                <span className={`badge ${ORDER_STATUS_LABELS[o.status]}`}>{o.status}</span>
              </div>
              <div className="text-muted-2 mt-1" style={{ fontSize: "0.85rem" }}>
                {o.items.map((i) => `${i.quantity}× ${i.product?.name}`).join(" · ")}
              </div>
              <div className="d-flex justify-content-between align-items-center mt-2">
                <span className="text-muted-2" style={{ fontSize: "0.78rem" }}>
                  Destino: {o.destination?.name} · {dateTime(o.createdAt)}
                  {o.receivedAt && ` · recibido ${dateTime(o.receivedAt)}`}
                </span>
                {o.status === "pendiente" && (
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-success" onClick={() => act(o._id, "receive")}>Recepcionar</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => act(o._id, "cancel")}>Cancelar</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title="Nuevo pedido a proveedor"
          onClose={() => setShowModal(false)}
          footer={<button className="btn btn-ink w-100" onClick={submit} disabled={sending}>{sending ? "Guardando…" : "Crear pedido"}</button>}
        >
          <ErrorAlert message={error} />
          <label className="form-label fw-bold small" htmlFor="po-proveedor">Proveedor</label>
          <input id="po-proveedor" className="form-control mb-2" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} placeholder="p. ej. Distribuidora Tai Loy" />
          <label className="form-label fw-bold small" htmlFor="po-ubicacion-de-destino">Ubicación de destino</label>
          <select id="po-ubicacion-de-destino" className="form-select mb-2" value={form.destinationId} onChange={(e) => setForm({ ...form, destinationId: e.target.value })}>
            <option value="">Selecciona…</option>
            {locations.data?.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
          <span className="form-label fw-bold small d-block">Productos</span>
          {form.items.map((item, index) => (
            <div key={item.key} className="d-flex gap-2 mb-2">
              <select className="form-select" value={item.productId} onChange={(e) => setItem(index, { productId: e.target.value })}>
                <option value="">Selecciona…</option>
                {products.data?.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <input type="number" min="1" className="form-control" style={{ width: 84 }} value={item.quantity} onChange={(e) => setItem(index, { quantity: e.target.value })} />
            </div>
          ))}
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setForm((f) => ({ ...f, items: [...f.items, { key: crypto.randomUUID(), productId: "", quantity: 1 }] }))}
          >
            + Agregar producto
          </button>
        </Modal>
      )}
    </>
  );
}
