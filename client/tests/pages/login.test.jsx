import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../src/api/client", async () => await import("../helpers/apiMock"));

const { default: api } = await import("../helpers/apiMock");
const { AuthProvider } = await import("../../src/context/AuthContext");
const { default: Login } = await import("../../src/pages/Login");

// RF-01: la pantalla de acceso delega en AuthContext y solo traduce el resultado
function montar() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<p>panel principal</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

const escribirCredenciales = (usuario, clave) => {
  fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: usuario } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: clave } });
};

beforeEach(() => vi.clearAllMocks());

describe("inicio de sesión", () => {
  test("con credenciales válidas entra al panel", async () => {
    api.post.mockResolvedValue({ data: { token: "jwt", user: { id: "u1", name: "Iván", role: "admin" } } });
    montar();

    escribirCredenciales("admin", "admin123");
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    await screen.findByText("panel principal");
    expect(api.post).toHaveBeenCalledWith("/api/auth/login", { username: "admin", password: "admin123" });
  });

  test("con credenciales inválidas muestra el mensaje del servidor y sigue en la pantalla", async () => {
    api.post.mockRejectedValue({ response: { data: { message: "Credenciales incorrectas" } } });
    montar();

    escribirCredenciales("admin", "mala");
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("Credenciales incorrectas")).toBeInTheDocument();
    expect(screen.queryByText("panel principal")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled();
  });

  test("mientras envía bloquea el botón para evitar el doble envío", async () => {
    let resolver;
    api.post.mockReturnValue(new Promise((r) => { resolver = r; }));
    montar();

    escribirCredenciales("admin", "admin123");
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByRole("button", { name: "Ingresando…" })).toBeDisabled();
    resolver({ data: { token: "jwt", user: { id: "u1", name: "Iván", role: "admin" } } });
    await screen.findByText("panel principal");
  });

  test("sin red muestra el mensaje genérico", async () => {
    api.post.mockRejectedValue(new Error("Network Error"));
    montar();

    escribirCredenciales("admin", "admin123");
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByText("No se pudo conectar con el servidor")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Ingresar" })).toBeEnabled());
  });
});
