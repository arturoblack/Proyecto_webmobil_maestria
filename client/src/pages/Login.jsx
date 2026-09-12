import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiMessage } from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await login(form.username, form.password);
      navigate("/");
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ls-blobs d-flex align-items-center justify-content-center min-vh-100 px-3">
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center text-white rounded-4 mb-3"
            style={{ width: 72, height: 72, background: "var(--ls-ink)", fontSize: 34, boxShadow: "0 10px 26px rgba(30,58,95,.35)" }}
          >
            📚
          </div>
          <h1 className="ls-display">
            Libre<span className="hl">Stock</span>
          </h1>
          <p className="text-muted-2">Tu librería, bajo control</p>
        </div>
        <div className="glass p-4">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <form onSubmit={handleSubmit}>
            <label className="form-label fw-bold small" htmlFor="login-usuario">Usuario</label>
            <input id="login-usuario"
              className="form-control mb-3"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoFocus
              required
            />
            <label className="form-label fw-bold small" htmlFor="login-contrasena">Contraseña</label>
            <input id="login-contrasena"
              type="password"
              className="form-control mb-4"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button type="submit" className="btn btn-ink w-100" disabled={sending}>
              {sending ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>
        <p className="text-center text-muted-2 mt-3" style={{ fontSize: "0.82rem" }}>
          ¿Olvidaste tu contraseña? Pídesela al administrador.
        </p>
      </div>
    </div>
  );
}
