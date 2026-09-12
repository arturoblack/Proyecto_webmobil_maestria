import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/api/client", async () => await import("../helpers/apiMock"));

const { default: api } = await import("../helpers/apiMock");
const { mockRoutes, renderPage, apiError, ALMACEN, TIENDA } = await import("../helpers/render");
const { default: Locations } = await import("../../src/pages/Locations");

// RF-03: almacenes y tiendas (solo administrador)
beforeEach(() => {
  vi.clearAllMocks();
  mockRoutes({ "/api/locations": [ALMACEN, TIENDA] });
});

describe("listado", () => {
  test("muestra cada sede con su tipo", async () => {
    renderPage(<Locations />);

    expect(await screen.findByText(/Almacén Central/)).toBeInTheDocument();
    expect(screen.getByText("almacen")).toBeInTheDocument();
    expect(screen.getByText("tienda")).toBeInTheDocument();
  });

  test("sin sedes invita a crear la primera", async () => {
    mockRoutes({ "/api/locations": [] });
    renderPage(<Locations />);

    expect(await screen.findByText(/Registra tu primer almacén/)).toBeInTheDocument();
  });
});

describe("alta de una sede", () => {
  test("envía el formulario, cierra el modal y recarga", async () => {
    api.post.mockResolvedValue({ data: {} });
    renderPage(<Locations />);
    await screen.findByText(/Almacén Central/);

    fireEvent.click(screen.getByText("+ Nueva ubicación"));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tienda Arequipa" } });
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "almacen" } });
    fireEvent.click(screen.getByText("Crear ubicación"));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/locations", { name: "Tienda Arequipa", type: "almacen" }));
    await waitFor(() => expect(screen.queryByText("Nueva ubicación")).not.toBeInTheDocument());
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  test("muestra el error de validación del servidor dentro del modal", async () => {
    api.post.mockRejectedValue(apiError("El nombre es obligatorio"));
    renderPage(<Locations />);
    await screen.findByText(/Almacén Central/);

    fireEvent.click(screen.getByText("+ Nueva ubicación"));
    fireEvent.click(screen.getByText("Crear ubicación"));

    expect(await screen.findAllByText("El nombre es obligatorio")).not.toHaveLength(0);
    expect(screen.getByText("Nueva ubicación")).toBeInTheDocument();
  });

  test("el fondo del modal lo cierra", async () => {
    renderPage(<Locations />);
    await screen.findByText(/Almacén Central/);

    fireEvent.click(screen.getByText("+ Nueva ubicación"));
    fireEvent.click(screen.getAllByLabelText("Cerrar")[0]);

    expect(screen.queryByText("Nueva ubicación")).not.toBeInTheDocument();
  });
});

describe("baja de una sede", () => {
  test("pide confirmación y, si se acepta, elimina y recarga", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.delete.mockResolvedValue({});
    renderPage(<Locations />);
    await screen.findByText(/Almacén Central/);

    fireEvent.click(screen.getAllByText("Eliminar")[0]);

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/api/locations/l1"));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  test("si se cancela la confirmación no llama a la API", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage(<Locations />);
    await screen.findByText(/Almacén Central/);

    fireEvent.click(screen.getAllByText("Eliminar")[0]);

    expect(api.delete).not.toHaveBeenCalled();
  });

  test("si la sede tiene existencias muestra el motivo del rechazo", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.delete.mockRejectedValue(apiError("La ubicación tiene existencias"));
    renderPage(<Locations />);
    await screen.findByText(/Almacén Central/);

    fireEvent.click(screen.getAllByText("Eliminar")[0]);

    expect(await screen.findByText("La ubicación tiene existencias")).toBeInTheDocument();
  });
});
