import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/api/client", async () => await import("../helpers/apiMock"));

const { default: api } = await import("../helpers/apiMock");
const { mockRoutes, renderPage, apiError, ADMIN, VENDEDOR } = await import("../helpers/render");
const { default: Users } = await import("../../src/pages/Users");

// RF-02: cuentas y roles (solo administrador)
beforeEach(() => {
  vi.clearAllMocks();
  mockRoutes({ "/api/users": [ADMIN, VENDEDOR] });
});

describe("listado de cuentas", () => {
  test("marca la cuenta propia y no permite eliminarla", async () => {
    renderPage(<Users />, { user: ADMIN });

    expect(await screen.findByText("(tú)")).toBeInTheDocument();
    expect(screen.getByText("@rosa")).toBeInTheDocument();
    // Solo la otra cuenta tiene botón de eliminar
    expect(screen.getAllByText("Eliminar")).toHaveLength(1);
  });

  test("sin cuentas muestra el estado vacío", async () => {
    mockRoutes({ "/api/users": [] });
    renderPage(<Users />);

    expect(await screen.findByText(/No hay usuarios/)).toBeInTheDocument();
  });
});

describe("alta de cuenta", () => {
  test("envía nombre, usuario, contraseña y rol", async () => {
    api.post.mockResolvedValue({ data: {} });
    renderPage(<Users />);
    await screen.findByText("@rosa");

    fireEvent.click(screen.getByText("+ Nuevo usuario"));
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Carlos Puma" } });
    fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: "carlos" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "carlos123" } });
    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "admin" } });
    fireEvent.click(screen.getByText("Crear usuario"));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/users", { name: "Carlos Puma", username: "carlos", password: "carlos123", role: "admin" })
    );
    await waitFor(() => expect(screen.queryByText("Nuevo usuario")).not.toBeInTheDocument());
  });

  test("un usuario repetido muestra el conflicto del servidor", async () => {
    api.post.mockRejectedValue(apiError("El usuario ya existe"));
    renderPage(<Users />);
    await screen.findByText("@rosa");

    fireEvent.click(screen.getByText("+ Nuevo usuario"));
    fireEvent.click(screen.getByText("Crear usuario"));

    expect(await screen.findAllByText("El usuario ya existe")).not.toHaveLength(0);
  });
});

describe("baja de cuenta", () => {
  test("elimina tras confirmar y recarga", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.delete.mockResolvedValue({});
    renderPage(<Users />);
    await screen.findByText("@rosa");

    fireEvent.click(screen.getByText("Eliminar"));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/api/users/u2"));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  test("respeta la cancelación y muestra el error del servidor", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage(<Users />);
    await screen.findByText("@rosa");

    fireEvent.click(screen.getByText("Eliminar"));
    expect(api.delete).not.toHaveBeenCalled();

    confirmar.mockReturnValue(true);
    api.delete.mockRejectedValue(apiError("No se puede eliminar"));
    fireEvent.click(screen.getByText("Eliminar"));
    expect(await screen.findByText("No se puede eliminar")).toBeInTheDocument();
  });
});
