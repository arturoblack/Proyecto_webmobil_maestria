import { useState } from "react";
import api, { apiMessage } from "../api/client";
import { useApi } from "../hooks/useApi";
import { Loader, ErrorAlert, EmptyState, Modal } from "../components/Ui";
import { dateTime, ORDER_STATUS_LABELS } from "../utils/format";

const EMPTY_FORM = { customerName: "", phone: "", locationId: "", notes: "", items: [{ key: "first", productId: "", quantity: 1 }] };

// RF-10: encargos de clientes; su registro no afecta el stock
export default function CustomerOrders() {
  const [statusFilter, setStatusFilter] = useState("pendiente");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const orders = useApi(
    () => api.get("/api/customer-orders", { params: { status: statusFilter || undefined } }),
    [statusFilter]
  );
  const products = useApi(() => api.get("/api/products"));
  const locations = useApi(() => api.get("/api/locations"));

  const setItem = (index, patch) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) }));

  const submit = async () => {
    setSending(true);
    setError("");
    try {
      await api.post("/api/customer-orders", {
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

  const changeStatus = async (id, status) => {
    try {
      await api.put(`/api/customer-orders/${id}/status`, { status });
      orders.refresh();
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Pedidos de clientes</h1>
        <button className="btn btn-ink btn-sm px-3" onClick={() => setShowModal(true)}>+ Registrar</button>
      </div>
      <div className="d-flex gap-2 mb-3">
        {["pendiente", "entregado", "cancelado", ""].map((s) => (
          <button
            key={s}
            className={`btn btn-sm rounded-pill ${statusFilter === s ? "btn-ink" : "btn-outline-secondary"}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === "" ? "Todos" : s}
          </button>
        ))}
      </div>
      <ErrorAlert message={error || orders.error} />
      {orders.loading && <Loader />}
      {!orders.loading && orders.data?.length === 0 && (
        <div className="glass p-4"><EmptyState>No hay pedidos con este estado.</EmptyState></div>
      )}
      {!orders.loading && orders.data?.length > 0 && (
        <div className="d-flex flex-column gap-2">
          {orders.data.map((o) => (
            <div key={o._id} className="glass p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div className="fw-bold">{o.customerName} {o.phone && <span className="text-muted-2 fw-normal">· {o.phone}</span>}</div>
                <span className={`badge ${ORDER_STATUS_LABELS[o.status]}`}>{o.status}</span>
              </div>
              <div className="text-muted-2 mt-1" style={{ fontSize: "0.85rem" }}>
                {o.items.map((i) => `${i.quantity}× ${i.product?.name}`).join(" · ")}
              </div>
              <div className="d-flex justify-content-between align-items-center mt-2">
                <span className="text-muted-2" style={{ fontSize: "0.78rem" }}>
                  {o.location?.name} · {o.user?.name} · {dateTime(o.createdAt)}
                </span>
                {o.status === "pendiente" && (
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-success" onClick={() => changeStatus(o._id, "entregado")}>Entregado</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => changeStatus(o._id, "cancelado")}>Cancelar</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title="Registrar pedido de cliente"
          onClose={() => setShowModal(false)}
          footer={<button className="btn btn-ink w-100" onClick={submit} disabled={sending}>{sending ? "Guardando…" : "Guardar pedido"}</button>}
        >
          <ErrorAlert message={error} />
          <div className="row g-2 mb-2">
            <div className="col-7">
              <label className="form-label fw-bold small" htmlFor="co-cliente">Cliente</label>
              <input id="co-cliente" className="form-control" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div className="col-5">
              <label className="form-label fw-bold small" htmlFor="co-telefono">Teléfono</label>
              <input id="co-telefono" className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <label className="form-label fw-bold small" htmlFor="co-tienda-que-atiende">Tienda que atiende</label>
          <select id="co-tienda-que-atiende" className="form-select mb-2" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
            <option value="">Selecciona…</option>
            {locations.data?.filter((l) => l.type === "tienda").map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
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
            className="btn btn-sm btn-outline-secondary mb-2"
            onClick={() => setForm((f) => ({ ...f, items: [...f.items, { key: crypto.randomUUID(), productId: "", quantity: 1 }] }))}
          >
            + Agregar producto
          </button>
          <label className="form-label fw-bold small" htmlFor="co-notas">Notas</label>
          <input id="co-notas" className="form-control" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="p. ej. recoge el viernes" />
        </Modal>
      )}
    </>
  );
}
