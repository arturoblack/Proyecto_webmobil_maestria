import { useMemo, useState } from "react";
import api from "../api/client";
import { useApi } from "../hooks/useApi";
import { Loader, ErrorAlert, EmptyState } from "../components/Ui";
import { money } from "../utils/format";

// RF-05 y RF-06: stock por ubicación con búsqueda, filtros y alertas de mínimo
export default function Inventory() {
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);

  const locations = useApi(() => api.get("/api/locations"));
  const stocks = useApi(
    () => api.get("/api/stocks", { params: { locationId: locationId || undefined, lowStock: onlyLow || undefined } }),
    [locationId, onlyLow]
  );

  // Agrupa las existencias por producto para mostrar una fila con insignias por sede
  const rows = useMemo(() => {
    if (!stocks.data) return [];
    const byProduct = new Map();
    for (const s of stocks.data) {
      if (!s.product) continue;
      const key = s.product._id;
      if (!byProduct.has(key)) byProduct.set(key, { product: s.product, stocks: [] });
      byProduct.get(key).stocks.push(s);
    }
    const term = search.trim().toLowerCase();
    return [...byProduct.values()]
      .filter(
        ({ product }) =>
          !term || product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term)
      )
      .sort((a, b) => a.product.name.localeCompare(b.product.name));
  }, [stocks.data, search]);

  return (
    <>
      <h1 className="mb-3">Inventario</h1>
      <div className="row g-2 mb-3">
        <div className="col-12 col-lg-5">
          <input
            className="form-control"
            placeholder="Buscar por nombre o SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-8 col-lg-4">
          <select className="form-select" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Todas las sedes</option>
            {locations.data?.map((l) => (
              <option key={l._id} value={l._id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div className="col-4 col-lg-3 d-flex align-items-center">
          <div className="form-check">
            <input
              id="low"
              type="checkbox"
              className="form-check-input"
              checked={onlyLow}
              onChange={(e) => setOnlyLow(e.target.checked)}
            />
            <label htmlFor="low" className="form-check-label fw-bold" style={{ fontSize: "0.86rem" }}>
              ⚠ Solo stock bajo
            </label>
          </div>
        </div>
      </div>

      <ErrorAlert message={stocks.error || locations.error} />
      {stocks.loading ? (
        <Loader />
      ) : rows.length === 0 ? (
        <div className="glass p-4"><EmptyState>No hay existencias que coincidan con el filtro.</EmptyState></div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {rows.map(({ product, stocks: productStocks }) => (
            <div key={product._id} className="glass p-3">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="fw-bold">{product.name}</div>
                  <div className="text-muted-2" style={{ fontSize: "0.8rem" }}>
                    SKU {product.sku} · {product.category}
                  </div>
                </div>
                <div className="fw-bold">{money(product.price)}</div>
              </div>
              <div className="d-flex flex-wrap gap-2 mt-2">
                {productStocks.map((s) => {
                  const low = s.quantity <= s.minStock;
                  return (
                    <span key={s._id} className={`badge ${low ? "badge-soft-amber" : "badge-soft-green"}`}>
                      {low ? <span className="hl">{s.location?.name} · {s.quantity} ⚠</span> : `${s.location?.name} · ${s.quantity}`}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
