import { useState } from "react";
import api, { apiMessage } from "../api/client";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { Loader, ErrorAlert, EmptyState, Modal } from "../components/Ui";

const EMPTY_FORM = { username: "", name: "", password: "", role: "vendedor" };

// RF-02: cuentas y roles (solo administrador)
export default function Users() {
  const { user: currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const users = useApi(() => api.get("/api/users"));

  const submit = async () => {
    setSending(true);
    setError("");
    try {
      await api.post("/api/users", form);
      setShowModal(false);
      setForm(EMPTY_FORM);
      users.refresh();
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSending(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`¿Eliminar la cuenta de ${u.name}?`)) return;
    try {
      await api.delete(`/api/users/${u._id}`);
      users.refresh();
    } catch (err) {
      setError(apiMessage(err));
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Usuarios</h1>
        <button className="btn btn-ink btn-sm px-3" onClick={() => setShowModal(true)}>+ Nuevo usuario</button>
      </div>
      <ErrorAlert message={error || users.error} />
      {users.loading ? (
        <Loader />
      ) : users.data.length === 0 ? (
        <div className="glass p-4"><EmptyState>No hay usuarios registrados.</EmptyState></div>
      ) : (
        <div className="glass p-3">
          {users.data.map((u) => (
            <div key={u._id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
              <div className="d-flex align-items-center gap-2">
                <span
                  className="d-flex align-items-center justify-content-center text-white rounded-circle fw-bold"
                  style={{ width: 36, height: 36, background: u.role === "admin" ? "var(--ls-ink)" : "var(--ls-amber)" }}
                >
                  {u.name[0]}
                </span>
                <div>
                  <div className="fw-bold">{u.name} {u._id === currentUser.id && <span className="text-muted-2 fw-normal">(tú)</span>}</div>
                  <div className="text-muted-2" style={{ fontSize: "0.78rem" }}>@{u.username}</div>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className={`badge ${u.role === "admin" ? "text-bg-primary" : "badge-soft-green"}`}>{u.role}</span>
                {u._id !== currentUser.id && (
                  <button className="btn btn-sm btn-outline-danger" onClick={() => remove(u)}>Eliminar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title="Nuevo usuario"
          onClose={() => setShowModal(false)}
          footer={<button className="btn btn-ink w-100" onClick={submit} disabled={sending}>{sending ? "Creando…" : "Crear usuario"}</button>}
        >
          <ErrorAlert message={error} />
          <label className="form-label fw-bold small">Nombre completo</label>
          <input className="form-control mb-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="row g-2 mb-2">
            <div className="col-6">
              <label className="form-label fw-bold small">Usuario</label>
              <input className="form-control" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="col-6">
              <label className="form-label fw-bold small">Contraseña</label>
              <input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <label className="form-label fw-bold small">Rol</label>
          <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="vendedor">Vendedor</option>
            <option value="admin">Administrador</option>
          </select>
        </Modal>
      )}
    </>
  );
}
