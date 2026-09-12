import { useState } from "react";
import api, { apiMessage } from "../api/client";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { Loader, ErrorAlert, EmptyState, Modal } from "../components/Ui";
import { dateTime, MOVEMENT_LABELS } from "../utils/format";

const EMPTY_FORM = { type: "entrada", productId: "", originId: "", destinationId: "", quantity: 1, reason: "" };

// RF-07 a RF-09: kardex + registro manual (solo administrador)
export default function Movements() {
  const { isAdmin } = useAuth();
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const movements = useApi(
    () => api.get("/api/movements", { params: { type: typeFilter || undefined } }),
    [typeFilter]
  );
  const products = useApi(() => api.get("/api/products"));
  const locations = useApi(() => api.get("/api/locations"));

  const needsOrigin = ["salida", "transferencia"].includes(form.type);
  const needsDestination = ["entrada", "transferencia"].includes(form.type);

  const submit = async () => {
    setSending(true);
    setError("");
    try {
      await api.post("/api/movements", { ...form, quantity: Number(form.quantity) });
      setShowModal(false);
      setForm(EMPTY_FORM);
      movements.refresh();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSending(false);
    }
  };

  const locationLine = (m) => {
    if (m.type === "transferencia") return `${m.origin?.name} → ${m.destination?.name}`;
    return m.origin?.name || m.destination?.name || "";
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Movimientos</h1>
        {isAdmin && (
          <button className="btn btn-ink btn-sm px-3" onClick={() => setShowModal(true)}>
            + Registrar
          </button>
        )}
      </div>

      <div className="d-flex gap-2 flex-wrap mb-3">
        {["", "entrada", "salida", "transferencia", "venta"].map((t) => (
          <button
            key={t}
            className={`btn btn-sm rounded-pill ${typeFilter === t ? "btn-ink" : "btn-outline-secondary"}`}
            onClick={() => setTypeFilter(t)}
          >
            {t === "" ? "Todos" : MOVEMENT_LABELS[t].label.toLowerCase()}
          </button>
        ))}
      </div>

      <ErrorAlert message={movements.error} />
      {movements.loading && <Loader />}
      {!movements.loading && movements.data.length === 0 && (
        <div className="glass p-4"><EmptyState>Aún no hay movimientos con este filtro.</EmptyState></div>
      )}
      {!movements.loading && movements.data.length > 0 && (
        <div className="d-flex flex-column gap-2">
          {movements.data.map((m) => (
            <div key={m._id} className="glass p-3">
              <div className="d-flex justify-content-between align-items-center">
                <span className={`badge ${MOVEMENT_LABELS[m.type].className}`}>{MOVEMENT_LABELS[m.type].label}</span>
                <span className="text-muted-2" style={{ fontSize: "0.78rem" }}>{dateTime(m.createdAt)}</span>
              </div>
              <div className="fw-bold mt-2">
                {m.quantity}× {m.product?.name}
                {m.reason && <span className="hl ms-2 fw-normal" style={{ fontSize: "0.82rem" }}>motivo: {m.reason}</span>}
              </div>
              <div className="text-muted-2" style={{ fontSize: "0.82rem" }}>
                {locationLine(m)} · {m.user?.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title="Registrar movimiento"
          onClose={() => setShowModal(false)}
          footer={
            <button className="btn btn-ink w-100" onClick={submit} disabled={sending}>
              {sending ? "Guardando…" : "Guardar movimiento"}
            </button>
          }
        >
          <ErrorAlert message={error} />
          <label className="form-label fw-bold small" htmlFor="mov-tipo">Tipo</label>
          <select id="mov-tipo"
            className="form-select mb-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value, originId: "", destinationId: "" })}
          >
            <option value="entrada">Entrada (compra directa / ajuste)</option>
            <option value="salida">Salida (merma / ajuste)</option>
            <option value="transferencia">Transferencia entre sedes</option>
          </select>
          <label className="form-label fw-bold small" htmlFor="mov-producto">Producto</label>
          <select id="mov-producto" className="form-select mb-2" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">Selecciona…</option>
            {products.data?.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          {needsOrigin && (
            <>
              <label className="form-label fw-bold small" htmlFor="mov-origen">Origen</label>
              <select id="mov-origen" className="form-select mb-2" value={form.originId} onChange={(e) => setForm({ ...form, originId: e.target.value })}>
                <option value="">Selecciona…</option>
                {locations.data?.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </>
          )}
          {needsDestination && (
            <>
              <label className="form-label fw-bold small" htmlFor="mov-destino">Destino</label>
              <select id="mov-destino" className="form-select mb-2" value={form.destinationId} onChange={(e) => setForm({ ...form, destinationId: e.target.value })}>
                <option value="">Selecciona…</option>
                {locations.data?.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </>
          )}
          <div className="row g-2">
            <div className="col-4">
              <label className="form-label fw-bold small" htmlFor="mov-cantidad">Cantidad</label>
              <input id="mov-cantidad" type="number" min="1" className="form-control" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="col-8">
              <label className="form-label fw-bold small" htmlFor="mov-motivo">Motivo</label>
              <input id="mov-motivo" className="form-control" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="p. ej. envase dañado" />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
