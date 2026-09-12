import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/api/client", async () => await import("../helpers/apiMock"));

const { default: api } = await import("../helpers/apiMock");
const { mockRoutes, renderPage, apiError, CUADERNO, LAPICERO } = await import("../helpers/render");
const { default: Products } = await import("../../src/pages/Products");

// RF-04: catálogo; el stock nunca se edita aquí
beforeEach(() => {
  vi.clearAllMocks();
  mockRoutes({ "/api/products": [CUADERNO, LAPICERO] });
});

describe("catálogo", () => {
  test("lista los productos con SKU y categoría", async () => {
    renderPage(<Products />);

    expect(await screen.findByText("Cuaderno A4")).toBeInTheDocument();
    expect(screen.getByText("SKU CUA-001")).toBeInTheDocument();
    expect(screen.getByText("Escritura")).toBeInTheDocument();
  });

  test("la búsqueda se envía al servidor como parámetro", async () => {
    renderPage(<Products />);
    await screen.findByText("Cuaderno A4");

    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "lapicero" } });

    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/products", { params: { search: "lapicero" } }));
  });

  test("sin productos muestra el estado vacío y el error si la API falla", async () => {
    mockRoutes({ "/api/products": [] });
    const { unmount } = renderPage(<Products />);
    expect(await screen.findByText(/No hay productos/)).toBeInTheDocument();
    unmount();

    mockRoutes({ "/api/products": new Error("Sin permiso") });
    renderPage(<Products />);
    expect(await screen.findByText("Sin permiso")).toBeInTheDocument();
  });
});

describe("alta y edición", () => {
  test("crea un producto con el precio convertido a número", async () => {
    api.post.mockResolvedValue({ data: {} });
    renderPage(<Products />);
    await screen.findByText("Cuaderno A4");

    fireEvent.click(screen.getByText("+ Nuevo producto"));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tijeras" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "TIJ-003" } });
    fireEvent.change(screen.getByLabelText("Precio (S/)"), { target: { value: "4.90" } });
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "Oficina" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Punta roma" } });
    fireEvent.click(screen.getByText("Guardar"));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/products", { name: "Tijeras", sku: "TIJ-003", category: "Oficina", price: 4.9, description: "Punta roma" })
    );
    await waitFor(() => expect(screen.queryByText("Nuevo producto")).not.toBeInTheDocument());
  });

  test("al editar precarga el formulario, bloquea el SKU y usa PUT", async () => {
    api.put.mockResolvedValue({ data: {} });
    renderPage(<Products />);
    await screen.findByText("Cuaderno A4");

    fireEvent.click(screen.getAllByText("Editar")[0]);

    expect(screen.getByText("Editar producto")).toBeInTheDocument();
    expect(screen.getByLabelText("SKU")).toBeDisabled();
    expect(screen.getByLabelText("SKU")).toHaveValue("CUA-001");
    fireEvent.change(screen.getByLabelText("Precio (S/)"), { target: { value: "13" } });
    fireEvent.click(screen.getByText("Guardar"));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/products/p1", expect.objectContaining({ sku: "CUA-001", price: 13 })));
  });

  test("muestra el error del servidor sin cerrar el modal", async () => {
    api.post.mockRejectedValue(apiError("El SKU ya existe"));
    renderPage(<Products />);
    await screen.findByText("Cuaderno A4");

    fireEvent.click(screen.getByText("+ Nuevo producto"));
    fireEvent.click(screen.getByText("Guardar"));

    expect(await screen.findAllByText("El SKU ya existe")).not.toHaveLength(0);
    expect(screen.getByText("Nuevo producto")).toBeInTheDocument();
  });
});

describe("baja", () => {
  test("elimina tras confirmar; si tiene existencias muestra el motivo", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    api.delete.mockResolvedValue({});
    renderPage(<Products />);
    await screen.findByText("Cuaderno A4");

    fireEvent.click(screen.getAllByText("Eliminar")[0]);
    expect(api.delete).not.toHaveBeenCalled();

    confirmar.mockReturnValue(true);
    fireEvent.click(screen.getAllByText("Eliminar")[0]);
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/api/products/p1"));

    api.delete.mockRejectedValue(apiError("El producto tiene existencias"));
    fireEvent.click(screen.getAllByText("Eliminar")[1]);
    expect(await screen.findByText("El producto tiene existencias")).toBeInTheDocument();
  });
});
