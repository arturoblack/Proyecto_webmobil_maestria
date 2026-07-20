import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Estrategia adaptativa (sección 4.3): barra inferior en móvil, menú lateral desde 992px
const DAILY_LINKS = [
  { to: "/", icon: "◧", label: "Inicio" },
  { to: "/inventario", icon: "▤", label: "Stock" },
  { to: "/vender", icon: "+", label: "Vender", sell: true },
  { to: "/movimientos", icon: "⇄", label: "Movs." },
  { to: "/pedidos-clientes", icon: "🗒", label: "Pedidos" },
];

const ADMIN_LINKS = [
  { to: "/pedidos-proveedor", icon: "🚚", label: "Pedidos proveedor" },
  { to: "/productos", icon: "🏷", label: "Productos" },
  { to: "/ubicaciones", icon: "🏬", label: "Ubicaciones" },
  { to: "/usuarios", icon: "👥", label: "Usuarios" },
];

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="ls-blobs container-fluid px-3 py-3">
      <div className="row g-3">
        <aside className="col-auto d-none d-lg-block">
          <nav className="glass side-nav p-3 d-flex flex-column">
            <div className="d-flex align-items-center gap-2 mb-3 px-2">
              <span
                className="d-flex align-items-center justify-content-center text-white rounded-3"
                style={{ width: 38, height: 38, background: "var(--ls-ink)", fontSize: 18 }}
              >
                📚
              </span>
              <strong className="ls-display fs-5">
                Libre<span className="hl">Stock</span>
              </strong>
            </div>
            {DAILY_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"}>
                <span>{l.icon}</span> {l.label}
              </NavLink>
            ))}
            {isAdmin && (
              <>
                <div className="section-label">ADMINISTRACIÓN</div>
                {ADMIN_LINKS.map((l) => (
                  <NavLink key={l.to} to={l.to}>
                    <span>{l.icon}</span> {l.label}
                  </NavLink>
                ))}
              </>
            )}
            <div className="mt-auto pt-3 d-flex align-items-center gap-2 px-2">
              <span
                className="d-flex align-items-center justify-content-center text-white rounded-circle fw-bold"
                style={{ width: 34, height: 34, background: "var(--ls-amber)" }}
              >
                {user?.name?.[0]}
              </span>
              <div className="flex-grow-1" style={{ fontSize: "0.82rem" }}>
                <div className="fw-bold">{user?.name}</div>
                <div className="text-muted-2">{isAdmin ? "Administrador" : "Vendedor"}</div>
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={logout} title="Cerrar sesión">
                ⎋
              </button>
            </div>
          </nav>
        </aside>

        <main className="col page-wrap">
          <Outlet />
        </main>
      </div>

      <nav className="glass bottom-nav d-lg-none">
        {DAILY_LINKS.map((l) =>
          l.sell ? (
            <NavLink key={l.to} to={l.to} className="sell-btn" aria-label="Vender">
              +
            </NavLink>
          ) : (
            <NavLink key={l.to} to={l.to} end={l.to === "/"}>
              <span style={{ fontSize: "1.05rem" }}>{l.icon}</span>
              {l.label}
            </NavLink>
          )
        )}
      </nav>
    </div>
  );
}
