import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/api/client", async () => await import("../helpers/apiMock"));

const { default: api } = await import("../helpers/apiMock");
const { mockRoutes, renderPage, apiError, ALMACEN, TIENDA, CUADERNO } = await import("../helpers/render");
const { default: PurchaseOrders } = await import("../../src/pages/PurchaseOrders");

// RF-11 y RF-12: pedidos a proveedor; la recepción genera entradas en el servidor
const PEDIDOS = [
  { _id: "po1", supplierName: "Distribuidora Tai Loy", status: "pendiente", items: [{ quantity: 50, product: CUADERNO }], destination: ALMACEN, createdAt: "2026-09-11T10:00:00Z" },
  { _id: "po2", supplierName: "Faber", status: "recibido", items: [{ quantity: 10, product: CUADERNO }], destination: ALMACEN, createdAt: "2026-09-10T10:00:00Z", receivedAt: "2026-09-11T09:00:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockRoutes({ "/api/purchase-orders": PEDIDOS, "/api/products": [CUADERNO], "/api/locations": [ALMACEN, TIENDA] });
});

describe("listado", () => {
  test("muestra proveedor, estado, ítems y fecha de recepción cuando existe", async () => {
    renderPage(<PurchaseOrders />);

    expect(await screen.findByText("Distribuidora Tai Loy")).toBeInTheDocument();
    expect(screen.getByText("50× Cuaderno A4")).toBeInTheDocument();
    expect(screen.getByText("recibido")).toBeInTheDocument();
    expect(screen.getByText(/· recibido/)).toBeInTheDocument();
    // Solo el pendiente se puede recepcionar
    expect(screen.getAllByText("Recepcionar")).toHaveLength(1);
  });

  test("recepcionar y cancelar llaman a la acción correspondiente", async () => {
    api.post.mockResolvedValue({ data: {} });
    renderPage(<PurchaseOrders />);
    await screen.findByText("Distribuidora Tai Loy");

    fireEvent.click(screen.getByText("Recepcionar"));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/purchase-orders/po1/receive"));

    api.post.mockRejectedValue(apiError("El pedido ya fue recibido"));
    fireEvent.click(screen.getByText("Cancelar"));
    expect(await screen.findByText("El pedido ya fue recibido")).toBeInTheDocument();
  });

  test("sin pedidos muestra el estado vacío", async () => {
    mockRoutes({ "/api/purchase-orders": [], "/api/products": [], "/api/locations": [] });
    renderPage(<PurchaseOrders />);

    expect(await screen.findByText(/Aún no hay pedidos/)).toBeInTheDocument();
  });
});

describe("nuevo pedido", () => {
  test("envía proveedor, destino y líneas con cantidad numérica", async () => {
    api.post.mockResolvedValue({ data: {} });
    renderPage(<PurchaseOrders />);
    await screen.findByText("Distribuidora Tai Loy");

    fireEvent.click(screen.getByText("+ Nuevo pedido"));
    fireEvent.change(screen.getByLabelText("Proveedor"), { target: { value: "Faber" } });
    fireEvent.change(screen.getByLabelText("Ubicación de destino"), { target: { value: "l1" } });
    fireEvent.click(screen.getByText("+ Agregar producto"));
    const selectores = screen.getAllByDisplayValue("Selecciona…").filter((s) => s.id !== "po-ubicacion-de-destino");
    expect(selectores).toHaveLength(2);
    fireEvent.change(selectores[1], { target: { value: "p1" } });
    fireEvent.change(screen.getAllByDisplayValue("1")[1], { target: { value: "25" } });
    fireEvent.click(screen.getByText("Crear pedido"));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/purchase-orders", expect.objectContaining({
        supplierName: "Faber", destinationId: "l1", items: [{ productId: "p1", quantity: 25 }],
      }))
    );
    await waitFor(() => expect(screen.queryByText("Nuevo pedido a proveedor")).not.toBeInTheDocument());
  });

  test("muestra el error del servidor sin cerrar el modal", async () => {
    api.post.mockRejectedValue(apiError("La ubicación de destino es obligatoria"));
    renderPage(<PurchaseOrders />);
    await screen.findByText("Distribuidora Tai Loy");

    fireEvent.click(screen.getByText("+ Nuevo pedido"));
    fireEvent.click(screen.getByText("Crear pedido"));

    expect(await screen.findAllByText("La ubicación de destino es obligatoria")).not.toHaveLength(0);
    expect(screen.getByText("Nuevo pedido a proveedor")).toBeInTheDocument();
  });
});
