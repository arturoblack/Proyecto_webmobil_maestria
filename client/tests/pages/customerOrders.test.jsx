import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/api/client", async () => await import("../helpers/apiMock"));

const { default: api } = await import("../helpers/apiMock");
const { mockRoutes, renderPage, apiError, ALMACEN, TIENDA, CUADERNO, LAPICERO } = await import("../helpers/render");
const { default: CustomerOrders } = await import("../../src/pages/CustomerOrders");

// RF-10: encargos de clientes; no tocan stock
const PEDIDOS = [
  { _id: "o1", customerName: "María López", phone: "999111222", status: "pendiente", items: [{ quantity: 2, product: CUADERNO }], location: TIENDA, user: { name: "Rosa" }, createdAt: "2026-09-11T10:00:00Z" },
  { _id: "o2", customerName: "Juan Pérez", status: "entregado", items: [{ quantity: 1, product: LAPICERO }], location: TIENDA, user: { name: "Rosa" }, createdAt: "2026-09-10T10:00:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockRoutes({ "/api/customer-orders": PEDIDOS, "/api/products": [CUADERNO, LAPICERO], "/api/locations": [ALMACEN, TIENDA] });
});

describe("listado de pedidos", () => {
  test("arranca filtrando pendientes y muestra cliente, teléfono e ítems", async () => {
    renderPage(<CustomerOrders />);

    expect(await screen.findByText("María López")).toBeInTheDocument();
    expect(screen.getByText("· 999111222")).toBeInTheDocument();
    expect(screen.getByText("2× Cuaderno A4")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/customer-orders", { params: { status: "pendiente" } });
  });

  test("solo los pendientes tienen acciones y el filtro Todos quita el estado", async () => {
    renderPage(<CustomerOrders />);
    await screen.findByText("María López");

    expect(screen.getAllByText("Entregado")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/customer-orders", { params: { status: undefined } }));
  });

  test("marcar entregado o cancelar cambia el estado en el servidor", async () => {
    api.put.mockResolvedValue({ data: {} });
    renderPage(<CustomerOrders />);
    await screen.findByText("María López");

    fireEvent.click(screen.getByRole("button", { name: "Entregado" }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/customer-orders/o1/status", { status: "entregado" }));

    api.put.mockRejectedValue(apiError("El pedido ya no está pendiente"));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByText("El pedido ya no está pendiente")).toBeInTheDocument();
  });

  test("sin pedidos muestra el estado vacío", async () => {
    mockRoutes({ "/api/customer-orders": [], "/api/products": [], "/api/locations": [] });
    renderPage(<CustomerOrders />);

    expect(await screen.findByText(/No hay pedidos/)).toBeInTheDocument();
  });
});

describe("registro de un pedido", () => {
  test("solo ofrece tiendas, permite varias líneas y descarta las vacías al enviar", async () => {
    api.post.mockResolvedValue({ data: {} });
    renderPage(<CustomerOrders />);
    await screen.findByText("María López");

    fireEvent.click(screen.getByText("+ Registrar"));
    const tienda = screen.getByLabelText("Tienda que atiende");
    expect(within(tienda).queryByText("Almacén Central")).not.toBeInTheDocument();
    expect(within(tienda).getByText("Tienda Jr. Lima")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "Ana Torres" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "988777666" } });
    fireEvent.change(tienda, { target: { value: "l2" } });
    fireEvent.click(screen.getByText("+ Agregar producto"));
    const selectores = screen.getAllByDisplayValue("Selecciona…").filter((s) => s.id !== "co-tienda-que-atiende");
    expect(selectores).toHaveLength(2);
    fireEvent.change(selectores[0], { target: { value: "p2" } });
    const cantidades = screen.getAllByDisplayValue("1");
    fireEvent.change(cantidades[0], { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Notas"), { target: { value: "recoge el viernes" } });
    fireEvent.click(screen.getByText("Guardar pedido"));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/customer-orders", expect.objectContaining({
        customerName: "Ana Torres", phone: "988777666", locationId: "l2", notes: "recoge el viernes",
        items: [{ productId: "p2", quantity: 3 }],
      }))
    );
    await waitFor(() => expect(screen.queryByText("Registrar pedido de cliente")).not.toBeInTheDocument());
  });

  test("el error de validación queda dentro del modal", async () => {
    api.post.mockRejectedValue(apiError("El pedido necesita al menos un producto"));
    renderPage(<CustomerOrders />);
    await screen.findByText("María López");

    fireEvent.click(screen.getByText("+ Registrar"));
    fireEvent.click(screen.getByText("Guardar pedido"));

    expect(await screen.findAllByText("El pedido necesita al menos un producto")).not.toHaveLength(0);
  });
});
