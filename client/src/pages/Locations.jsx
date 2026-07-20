import { useState } from "react";
import api, { apiMessage } from "../api/client";
import { useApi } from "../hooks/useApi";
import { Loader, ErrorAlert, EmptyState, Modal } from "../components/Ui";

// RF-03: almacenes y tiendas del negocio
export default function Locations() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "tienda" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const locations = useApi(() => api.get("/api/locations"));

  const submit = async () => {
    setSending(true);
    setError("");
    try {
      await api.post("/api/locations", form);
      setShowModal(false);
      setForm({ name: "", type: "tienda" });
      locations.refresh();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSending(false);
    }
  };

  const remove = async (l) => {
    if (!window.confirm(`¿Eliminar "${l.name}"? Solo es posible sin existencias.`)) return;
    try {
      await api.delete(`/api/locations/${l._id}`);
      locations.refresh();
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Ubicaciones</h1>
        <button className="btn btn-ink btn-sm px-3" onClick={() => setShowModal(true)}>+ Nueva ubicación</button>
      </div>
      <ErrorAlert message={error || locations.error} />
      {locations.loading ? (
        <Loader />
      ) : locations.data.length === 0 ? (
        <div className="glass p-4"><EmptyState>Registra tu primer almacén o tienda.</EmptyState></div>
      ) : (
        <div className="row g-2">
          {locations.data.map((l) => (
            <div key={l._id} className="col-12 col-md-6 col-lg-4">
              <div className="glass p-3 d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-bold">{l.type === "almacen" ? "🏬" : "🛍"} {l.name}</div>
                  <span className={`badge ${l.type === "almacen" ? "text-bg-primary" : "badge-soft-green"}`}>{l.type}</span>
                </div>
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(l)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title="Nueva ubicación"
          onClose={() => setShowModal(false)}
          footer={<button className="btn btn-ink w-100" onClick={submit} disabled={sending}>{sending ? "Guardando…" : "Crear ubicación"}</button>}
        >
          <ErrorAlert message={error} />
          <label className="form-label fw-bold small">Nombre</label>
          <input className="form-control mb-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="p. ej. Tienda Jr. Lima" />
          <label className="form-label fw-bold small">Tipo</label>
          <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="tienda">Tienda (punto de venta)</option>
            <option value="almacen">Almacén (solo guarda mercadería)</option>
          </select>
        </Modal>
      )}
    </>
  );
}
