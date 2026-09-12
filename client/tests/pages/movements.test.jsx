import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/api/client", async () => await import("../helpers/apiMock"));

const { default: api } = await import("../helpers/apiMock");
const { mockRoutes, renderPage, apiError, ADMIN, VENDEDOR, ALMACEN, TIENDA, CUADERNO } = await import("../helpers/render");
const { default: Movements } = await import("../../src/pages/Movements");

// RF-07 a RF-09: kardex y registro manual (solo administrador)
const MOVIMIENTOS = [
  { _id: "m1", type: "entrada", quantity: 20, product: CUADERNO, destination: ALMACEN, user: { name: "Iván" }, createdAt: "2026-09-11T10:00:00Z", reason: "compra" },
  { _id: "m2", type: "transferencia", quantity: 5, product: CUADERNO, origin: ALMACEN, destination: TIENDA, user: { name: "Iván" }, createdAt: "2026-09-11T11:00:00Z" },
  { _id: "m3", type: "venta", quantity: 1, product: CUADERNO, origin: TIENDA, user: { name: "Rosa" }, createdAt: "2026-09-11T12:00:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockRoutes({ "/api/movements": MOVIMIENTOS, "/api/products": [CUADERNO], "/api/locations": [ALMACEN, TIENDA] });
});

describe("kardex", () => {
  test("muestra cada movimiento con su tipo, motivo y recorrido", async () => {
    renderPage(<Movements />, { user: ADMIN });

    expect(await screen.findByText("ENTRADA")).toBeInTheDocument();
    expect(screen.getByText("motivo: compra")).toBeInTheDocument();
    expect(screen.getByText(/Almacén Central → Tienda Jr\. Lima/)).toBeInTheDocument();
    expect(screen.getByText(/Tienda Jr\. Lima · Rosa/)).toBeInTheDocument();
  });

  test("el filtro por tipo se envía al servidor", async () => {
    renderPage(<Movements />);
    await screen.findByText("ENTRADA");

    fireEvent.click(screen.getByRole("button", { name: "venta" }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/movements", { params: { type: "venta" } }));
  });

  test("sin movimientos muestra el estado vacío", async () => {
    mockRoutes({ "/api/movements": [], "/api/products": [], "/api/locations": [] });
    renderPage(<Movements />);

    expect(await screen.findByText(/Aún no hay movimientos/)).toBeInTheDocument();
  });

  test("el vendedor no ve el botón de registrar", async () => {
    renderPage(<Movements />, { user: VENDEDOR });
    await screen.findByText("ENTRADA");

    expect(screen.queryByText("+ Registrar")).not.toBeInTheDocument();
  });
});

describe("registro manual", () => {
  const abrirModal = async () => {
    renderPage(<Movements />, { user: ADMIN });
    await screen.findByText("ENTRADA");
    fireEvent.click(screen.getByText("+ Registrar"));
  };

  test("una entrada solo pide destino; una salida solo origen; una transferencia ambos", async () => {
    await abrirModal();

    expect(screen.getByLabelText("Destino")).toBeInTheDocument();
    expect(screen.queryByLabelText("Origen")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "salida" } });
    expect(screen.getByLabelText("Origen")).toBeInTheDocument();
    expect(screen.queryByLabelText("Destino")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "transferencia" } });
    expect(screen.getByLabelText("Origen")).toBeInTheDocument();
    expect(screen.getByLabelText("Destino")).toBeInTheDocument();
  });

  test("envía la transferencia con la cantidad como número y recarga el kardex", async () => {
    api.post.mockResolvedValue({ data: {} });
    await abrirModal();

    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "transferencia" } });
    fireEvent.change(screen.getByLabelText("Producto"), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText("Origen"), { target: { value: "l1" } });
    fireEvent.change(screen.getByLabelText("Destino"), { target: { value: "l2" } });
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "reposición" } });
    fireEvent.click(screen.getByText("Guardar movimiento"));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/movements", {
        type: "transferencia", productId: "p1", originId: "l1", destinationId: "l2", quantity: 7, reason: "reposición",
      })
    );
    await waitFor(() => expect(screen.queryByText("Registrar movimiento")).not.toBeInTheDocument());
    expect(api.get).toHaveBeenCalledWith("/api/movements", { params: { type: undefined } });
  });

  test("un rechazo del servidor (stock insuficiente) queda visible en el modal", async () => {
    api.post.mockRejectedValue(apiError("Stock insuficiente en Almacén Central"));
    await abrirModal();

    fireEvent.click(screen.getByText("Guardar movimiento"));

    expect(await screen.findAllByText("Stock insuficiente en Almacén Central")).not.toHaveLength(0);
    expect(screen.getByText("Registrar movimiento")).toBeInTheDocument();
  });
});
