import { useState } from "react";
import api, { apiMessage } from "../api/client";
import { useApi } from "../hooks/useApi";
import { Loader, ErrorAlert, EmptyState, Modal } from "../components/Ui";
import { money } from "../utils/format";

const CATEGORIES = ["Cuadernos", "Escritura", "Arte", "Papelería", "Oficina", "Otros"];
const EMPTY_FORM = { name: "", sku: "", category: "Otros", price: "", description: "" };

// RF-04: mantenimiento del catálogo; el stock jamás se edita aquí (solo vía movimientos)
export default function Products() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | producto
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const products = useApi(() => api.get("/api/products", { params: { search: search || undefined } }), [search]);

  const openNew = () => { setForm(EMPTY_FORM); setEditing("new"); setError(""); };
  const openEdit = (p) => { setForm({ name: p.name, sku: p.sku, category: p.category, price: p.price, description: p.description || "" }); setEditing(p); setError(""); };

  const submit = async () => {
    setSending(true);
    setError("");
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editing === "new") await api.post("/api/products", payload);
      else await api.put(`/api/products/${editing._id}`, payload);
      setEditing(null);
      products.refresh();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSending(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.name}"? Solo es posible si no tiene existencias.`)) return;
    try {
      await api.delete(`/api/products/${p._id}`);
      products.refresh();
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Productos</h1>
        <button className="btn btn-ink btn-sm px-3" onClick={openNew}>+ Nuevo producto</button>
      </div>
      <input className="form-control mb-3" placeholder="Buscar por nombre o SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <ErrorAlert message={error || products.error} />
      {products.loading && <Loader />}
      {!products.loading && products.data.length === 0 && (
        <div className="glass p-4"><EmptyState>No hay productos en el catálogo.</EmptyState></div>
      )}
      {!products.loading && products.data.length > 0 && (
        <div className="glass p-3">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="text-muted-2" style={{ fontSize: "0.78rem" }}>
                  <th>PRODUCTO</th><th>CATEGORÍA</th><th className="text-end">PRECIO</th><th className="text-end">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {products.data.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="fw-bold">{p.name}</div>
                      <div className="text-muted-2" style={{ fontSize: "0.78rem" }}>SKU {p.sku}</div>
                    </td>
                    <td>{p.category}</td>
                    <td className="text-end fw-bold">{money(p.price)}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => openEdit(p)}>Editar</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(p)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing !== null && (
        <Modal
          title={editing === "new" ? "Nuevo producto" : "Editar producto"}
          onClose={() => setEditing(null)}
          footer={<button className="btn btn-ink w-100" onClick={submit} disabled={sending}>{sending ? "Guardando…" : "Guardar"}</button>}
        >
          <ErrorAlert message={error} />
          <label className="form-label fw-bold small" htmlFor="prod-nombre">Nombre</label>
          <input id="prod-nombre" className="form-control mb-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="row g-2 mb-2">
            <div className="col-6">
              <label className="form-label fw-bold small" htmlFor="prod-sku">SKU</label>
              <input id="prod-sku" className="form-control" value={form.sku} disabled={editing !== "new"} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="col-6">
              <label className="form-label fw-bold small" htmlFor="prod-precio-s">Precio (S/)</label>
              <input id="prod-precio-s" type="number" min="0" step="0.10" className="form-control" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>
          <label className="form-label fw-bold small" htmlFor="prod-categoria">Categoría</label>
          <select id="prod-categoria" className="form-select mb-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="form-label fw-bold small" htmlFor="prod-descripcion">Descripción</label>
          <input id="prod-descripcion" className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <p className="text-muted-2 mt-2 mb-0" style={{ fontSize: "0.76rem" }}>
            Las existencias no se editan aquí: usa Movimientos para entradas, salidas o transferencias.
          </p>
        </Modal>
      )}
    </>
  );
}
