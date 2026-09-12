import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/api/client", async () => await import("../helpers/apiMock"));

const { default: api } = await import("../helpers/apiMock");
const { mockRoutes, renderPage, ALMACEN, TIENDA, CUADERNO, LAPICERO } = await import("../helpers/render");
const { default: Inventory } = await import("../../src/pages/Inventory");

// RF-05 y RF-06: el stock es por producto–ubicación y se agrupa por producto en pantalla
const STOCKS = [
  { _id: "s1", product: CUADERNO, location: ALMACEN, quantity: 40, minStock: 5 },
  { _id: "s2", product: CUADERNO, location: TIENDA, quantity: 2, minStock: 5 },
  { _id: "s3", product: LAPICERO, location: TIENDA, quantity: 100, minStock: 10 },
  { _id: "s4", product: null, location: TIENDA, quantity: 1, minStock: 1 }, // producto borrado: se ignora
];

beforeEach(() => {
  vi.clearAllMocks();
  mockRoutes({ "/api/locations": [ALMACEN, TIENDA], "/api/stocks": STOCKS });
});

describe("inventario", () => {
  test("agrupa las existencias por producto con una insignia por sede", async () => {
    renderPage(<Inventory />);

    expect(await screen.findByText("Cuaderno A4")).toBeInTheDocument();
    expect(screen.getByText("Almacén Central · 40")).toBeInTheDocument();
    // La sede bajo mínimo se resalta con la advertencia
    expect(screen.getByText(/Tienda Jr\. Lima · 2 ⚠/)).toBeInTheDocument();
    expect(screen.getByText("Lapicero azul")).toBeInTheDocument();
  });

  test("filtra por nombre o SKU sin volver a pedir datos", async () => {
    renderPage(<Inventory />);
    await screen.findByText("Cuaderno A4");
    const llamadas = api.get.mock.calls.length;

    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "lap-002" } });

    expect(screen.queryByText("Cuaderno A4")).not.toBeInTheDocument();
    expect(screen.getByText("Lapicero azul")).toBeInTheDocument();
    expect(api.get.mock.calls.length).toBe(llamadas);
  });

  test("sin coincidencias muestra el estado vacío", async () => {
    renderPage(<Inventory />);
    await screen.findByText("Cuaderno A4");

    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "tijeras" } });

    expect(screen.getByText(/No hay existencias/)).toBeInTheDocument();
  });

  test("el filtro de sede y el de stock bajo se envían al servidor", async () => {
    renderPage(<Inventory />);
    await screen.findByText("Cuaderno A4");

    fireEvent.change(screen.getByDisplayValue("Todas las sedes"), { target: { value: TIENDA._id } });
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/api/stocks", { params: { locationId: TIENDA._id, lowStock: undefined } })
    );

    fireEvent.click(screen.getByLabelText(/Solo stock bajo/));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/api/stocks", { params: { locationId: TIENDA._id, lowStock: true } })
    );
  });

  test("si la API falla muestra el mensaje", async () => {
    mockRoutes({ "/api/locations": [], "/api/stocks": new Error("Sin acceso") });
    renderPage(<Inventory />);

    expect(await screen.findByText("Sin acceso")).toBeInTheDocument();
  });
});
