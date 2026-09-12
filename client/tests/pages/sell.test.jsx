import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/api/client", async () => await import("../helpers/apiMock"));

const { default: api } = await import("../helpers/apiMock");
const { mockRoutes, renderPage, apiError, ALMACEN, TIENDA, CUADERNO, LAPICERO } = await import("../helpers/render");
const { default: Sell } = await import("../../src/pages/Sell");

// RF-13: punto de venta. El vuelto que se muestra es informativo: el servidor recalcula y decide.
const STOCK_TIENDA = [
  { _id: "s1", product: CUADERNO, location: TIENDA, quantity: 2, minStock: 5 },
  { _id: "s2", product: LAPICERO, location: TIENDA, quantity: 0, minStock: 10 },
];

const botonCobrar = () => screen.getByRole("button", { name: /^Cobrar/ });

beforeEach(() => {
  vi.clearAllMocks();
  mockRoutes({ "/api/locations": [ALMACEN, TIENDA], "/api/stocks": STOCK_TIENDA });
});

describe("catálogo de la tienda", () => {
  test("elige la primera tienda, pide su stock y deshabilita lo agotado", async () => {
    renderPage(<Sell />);

    expect(await screen.findByText("Cuaderno A4")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/stocks", { params: { locationId: "l2" } });
    expect(screen.getByText("Stock tienda: 2 ⚠")).toBeInTheDocument();
    expect(screen.getByText("Lapicero azul").closest("button")).toBeDisabled();
    // El almacén no es punto de venta
    expect(screen.queryByText("Almacén Central")).not.toBeInTheDocument();
  });

  test("la búsqueda filtra en memoria y sin resultados lo dice", async () => {
    renderPage(<Sell />);
    await screen.findByText("Cuaderno A4");

    fireEvent.change(screen.getByPlaceholderText(/Buscar producto/), { target: { value: "tijeras" } });

    expect(screen.getByText(/Sin productos con stock/)).toBeInTheDocument();
  });

  test("sin tiendas registradas avisa y no permite cobrar", async () => {
    mockRoutes({ "/api/locations": [ALMACEN], "/api/stocks": [] });
    renderPage(<Sell />);

    expect(await screen.findByText(/No hay tiendas registradas/)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith("/api/stocks", expect.anything());
  });
});

describe("carrito y pago", () => {
  test("acumula unidades sin superar el stock y permite restar hasta quitar", async () => {
    renderPage(<Sell />);
    const producto = (await screen.findByText("Cuaderno A4")).closest("button");

    fireEvent.click(producto);
    fireEvent.click(producto);
    fireEvent.click(producto); // tercera pulsación: el stock es 2

    expect(screen.getByText("Carrito · 1 productos")).toBeInTheDocument();
    expect(screen.getByText("2", { selector: "strong" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "−" }));
    fireEvent.click(screen.getByRole("button", { name: "−" }));
    expect(screen.getByText(/Toca un producto/)).toBeInTheDocument();
  });

  test("en efectivo solo cobra cuando lo pagado cubre el total y calcula el vuelto", async () => {
    renderPage(<Sell />);
    fireEvent.click((await screen.findByText("Cuaderno A4")).closest("button"));

    expect(botonCobrar()).toBeDisabled();
    fireEvent.change(screen.getByLabelText("PAGA CON"), { target: { value: "10" } });
    expect(botonCobrar()).toBeDisabled();
    fireEvent.change(screen.getByLabelText("PAGA CON"), { target: { value: "20" } });
    expect(botonCobrar()).toBeEnabled();
    expect(screen.getByText(/7\.50/)).toBeInTheDocument(); // vuelto 20 − 12.50
  });

  test("con billetera digital cobra sin pedir monto y envía el pago exacto", async () => {
    api.post.mockResolvedValue({ data: {} });
    renderPage(<Sell />);
    fireEvent.click((await screen.findByText("Cuaderno A4")).closest("button"));

    fireEvent.click(screen.getByText(/Billetera digital/));
    expect(screen.queryByLabelText("PAGA CON")).not.toBeInTheDocument();
    fireEvent.click(botonCobrar());

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/sales", {
        locationId: "l2",
        items: [{ productId: "p1", quantity: 1 }],
        payment: { method: "billetera", paidWith: undefined },
      })
    );
    expect(await screen.findByText(/Venta cobrada/)).toBeInTheDocument();
    expect(screen.getByText("Carrito · 0 productos")).toBeInTheDocument();
  });

  test("en efectivo envía el monto pagado y vacía el carrito al confirmar", async () => {
    api.post.mockResolvedValue({ data: {} });
    renderPage(<Sell />);
    fireEvent.click((await screen.findByText("Cuaderno A4")).closest("button"));
    fireEvent.change(screen.getByLabelText("PAGA CON"), { target: { value: "20" } });

    fireEvent.click(botonCobrar());

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/sales", expect.objectContaining({ payment: { method: "efectivo", paidWith: 20 } }))
    );
    await waitFor(() => expect(screen.getByLabelText("PAGA CON")).toHaveValue(null));
  });

  test("si el servidor rechaza la venta el carrito se conserva y se ve el motivo", async () => {
    api.post.mockRejectedValue(apiError("Stock insuficiente para Cuaderno A4"));
    renderPage(<Sell />);
    fireEvent.click((await screen.findByText("Cuaderno A4")).closest("button"));
    fireEvent.click(screen.getByText(/Billetera digital/));

    fireEvent.click(botonCobrar());

    expect(await screen.findByText("Stock insuficiente para Cuaderno A4")).toBeInTheDocument();
    expect(screen.getByText("Carrito · 1 productos")).toBeInTheDocument();
  });

  test("cambiar de tienda vacía el carrito y pide el stock de la nueva", async () => {
    const OTRA = { _id: "l3", name: "Tienda Arequipa", type: "tienda" };
    mockRoutes({ "/api/locations": [TIENDA, OTRA], "/api/stocks": STOCK_TIENDA });
    renderPage(<Sell />);
    fireEvent.click((await screen.findByText("Cuaderno A4")).closest("button"));

    fireEvent.change(screen.getByDisplayValue("Tienda Jr. Lima"), { target: { value: "l3" } });

    expect(screen.getByText("Carrito · 0 productos")).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/stocks", { params: { locationId: "l3" } }));
  });
});
