import api from "../api/client";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { Loader, ErrorAlert, StatCard, EmptyState } from "../components/Ui";
import { money, dateTime, MOVEMENT_LABELS } from "../utils/format";

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useApi(() => api.get("/api/stats"));

  if (loading) return <Loader />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <>
      <p className="text-muted-2 mb-0">Hola, {user.name.split(" ")[0]} 👋</p>
      <h1 className="mb-3">Panel de control</h1>

      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3">
          <StatCard
            label="VALOR INVENTARIO"
            value={money(data.inventoryValue)}
            detail={`${data.totalUnits} unidades · ${data.totalProducts} productos`}
            highlight
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            label="VENTAS DE HOY"
            value={money(data.todaySales.amount)}
            detail={`▲ ${data.todaySales.units} unidades · ${data.todaySales.count} ventas`}
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard label="STOCK CRÍTICO" value={`${data.lowStockCount} ítems`} tone="#8a5a00" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            label="PEDIDOS PENDIENTES"
            value={data.pendingOrders.customer + data.pendingOrders.purchase}
            detail={`${data.pendingOrders.customer} de clientes · ${data.pendingOrders.purchase} a proveedor`}
          />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="glass p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="fs-5 mb-0">⚠ Stock crítico</h2>
              <span className="badge text-bg-warning">{data.lowStockCount}</span>
            </div>
            {data.lowStock.length === 0 && <EmptyState>Sin alertas: todo el stock está sobre el mínimo.</EmptyState>}
            {data.lowStock.map((s) => (
              <div key={s._id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <div className="fw-bold">{s.product?.name}</div>
                  <div className="text-muted-2" style={{ fontSize: "0.8rem" }}>{s.location?.name}</div>
                </div>
                <span className="badge badge-soft-amber">
                  <span className="hl">{s.quantity} / mín {s.minStock}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="glass p-3 h-100">
            <h2 className="fs-5">Actividad reciente</h2>
            {data.recentMovements.length === 0 && <EmptyState>Aún no hay movimientos registrados.</EmptyState>}
            {data.recentMovements.map((m) => (
              <div key={m._id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div style={{ minWidth: 0 }}>
                  <div className="fw-bold text-truncate">
                    {m.quantity}× {m.product?.name}
                  </div>
                  <div className="text-muted-2" style={{ fontSize: "0.78rem" }}>
                    {m.user?.name} · {dateTime(m.createdAt)}
                  </div>
                </div>
                <span className={`badge ${MOVEMENT_LABELS[m.type].className}`}>{MOVEMENT_LABELS[m.type].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
