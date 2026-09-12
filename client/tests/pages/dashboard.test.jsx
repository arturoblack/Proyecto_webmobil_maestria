import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/api/client", async () => await import("../helpers/apiMock"));

const { mockRoutes, renderPage, ADMIN } = await import("../helpers/render");
const { default: Dashboard } = await import("../../src/pages/Dashboard");

// RF-14: el panel se arma con una sola petición a /api/stats
const STATS = {
  inventoryValue: 1520.5,
  totalUnits: 340,
  totalProducts: 10,
  todaySales: { amount: 85, units: 12, count: 3 },
  lowStockCount: 1,
  pendingOrders: { customer: 2, purchase: 1 },
  lowStock: [{ _id: "s1", product: { name: "Cuaderno A4" }, location: { name: "Tienda Jr. Lima" }, quantity: 2, minStock: 5 }],
  recentMovements: [
    { _id: "m1", type: "venta", quantity: 3, product: { name: "Lapicero azul" }, user: { name: "Rosa" }, createdAt: "2026-09-11T10:00:00Z" },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe("panel de control", () => {
  test("muestra el saludo, los indicadores, el stock crítico y la actividad", async () => {
    mockRoutes({ "/api/stats": STATS });
    renderPage(<Dashboard />, { user: ADMIN });

    expect(await screen.findByText(/Hola, Iván/)).toBeInTheDocument();
    expect(screen.getByText("340 unidades · 10 productos")).toBeInTheDocument();
    expect(screen.getByText("▲ 12 unidades · 3 ventas")).toBeInTheDocument();
    expect(screen.getByText("1 ítems")).toBeInTheDocument();
    expect(screen.getByText("2 de clientes · 1 a proveedor")).toBeInTheDocument();
    expect(screen.getByText("2 / mín 5")).toBeInTheDocument();
    expect(screen.getByText(/3× Lapicero azul/)).toBeInTheDocument();
    expect(screen.getByText("VENTA")).toBeInTheDocument();
  });

  test("sin alertas ni movimientos muestra los estados vacíos", async () => {
    mockRoutes({ "/api/stats": { ...STATS, lowStockCount: 0, lowStock: [], recentMovements: [] } });
    renderPage(<Dashboard />);

    expect(await screen.findByText(/Sin alertas/)).toBeInTheDocument();
    expect(screen.getByText(/Aún no hay movimientos/)).toBeInTheDocument();
  });

  test("si la API falla muestra el error y no el panel", async () => {
    mockRoutes({ "/api/stats": new Error("Sesión expirada") });
    renderPage(<Dashboard />);

    expect(await screen.findByText("Sesión expirada")).toBeInTheDocument();
    expect(screen.queryByText("Panel de control")).not.toBeInTheDocument();
  });
});
