// Componentes de interfaz compartidos, pequeños y sin lógica de negocio

export function Loader() {
  return (
    <div className="text-center py-5">
      <output className="spinner-border" style={{ color: "var(--ls-ink)" }} />
      <p className="text-muted-2 mt-2 mb-0">Cargando…</p>
    </div>
  );
}

export function ErrorAlert({ message }) {
  if (!message) return null;
  return <div className="alert alert-danger py-2">{message}</div>;
}

export function EmptyState({ children }) {
  return <p className="text-center text-muted-2 py-4 mb-0">{children}</p>;
}

export function StatCard({ label, value, detail, highlight = false, tone }) {
  return (
    <div className="glass p-3 h-100">
      <p className="text-muted-2 fw-bold mb-1" style={{ fontSize: "0.72rem", letterSpacing: "0.04em" }}>
        {label}
      </p>
      <p className="ls-display fw-bold fs-4 mb-1" style={tone ? { color: tone } : undefined}>
        {highlight ? <span className="hl">{value}</span> : value}
      </p>
      {detail && <p className="text-muted-2 mb-0" style={{ fontSize: "0.78rem" }}>{detail}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal d-block">
      {/* El fondo es un botón real: se cierra con clic, con Enter y con lector de pantalla */}
      <button
        type="button"
        className="position-absolute top-0 start-0 w-100 h-100 border-0 p-0"
        style={{ background: "rgba(21, 42, 70, 0.45)" }}
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content glass border-0">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title ls-display">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer border-0 pt-0">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
