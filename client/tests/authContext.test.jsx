import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// La única instancia de Axios se sustituye: estas pruebas verifican el manejo de
// la sesión, no la red. El contrato real de /api/auth/login ya está cubierto por
// las 15 pruebas de auth.api.test.js en el servidor.
vi.mock("../src/api/client", () => ({
  default: { post: vi.fn() },
  apiMessage: (error) => error?.response?.data?.message || "No se pudo conectar con el servidor",
}));

const { AuthProvider, useAuth } = await import("../src/context/AuthContext");
const { default: api } = await import("../src/api/client");

const ADMIN = { _id: "1", username: "admin", role: "admin" };
const VENDEDOR = { _id: "2", username: "rosa", role: "vendedor" };

const envoltorio = ({ children }) => <AuthProvider>{children}</AuthProvider>;

const montarSesion = () => renderHook(() => useAuth(), { wrapper: envoltorio });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("estado inicial de la sesión", () => {
  test("sin nada guardado no hay usuario", () => {
    const { result } = montarSesion();

    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  test("rehidrata el usuario guardado al recargar la página", () => {
    // Sin esto, recargar el navegador expulsaría al usuario de su sesión
    localStorage.setItem("user", JSON.stringify(VENDEDOR));

    const { result } = montarSesion();

    expect(result.current.user).toEqual(VENDEDOR);
  });
});

describe("login", () => {
  test("guarda el token y el usuario, y expone la sesión", async () => {
    api.post.mockResolvedValue({ data: { token: "token-emitido", user: ADMIN } });
    const { result } = montarSesion();

    await act(async () => {
      await result.current.login("admin", "admin123");
    });

    expect(api.post).toHaveBeenCalledWith("/api/auth/login", {
      username: "admin",
      password: "admin123",
    });
    expect(localStorage.getItem("token")).toBe("token-emitido");
    await waitFor(() => expect(result.current.user).toEqual(ADMIN));
  });

  test("unas credenciales incorrectas no dejan sesión a medias", async () => {
    const fallo = { response: { status: 400, data: { message: "Credenciales incorrectas" } } };
    api.post.mockRejectedValue(fallo);
    const { result } = montarSesion();

    await expect(
      act(async () => {
        await result.current.login("admin", "clave-incorrecta");
      })
    ).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(result.current.user).toBeNull();
  });
});

describe("isAdmin — derivación del rol", () => {
  test("es verdadero solo para el rol admin", async () => {
    api.post.mockResolvedValue({ data: { token: "t", user: ADMIN } });
    const { result } = montarSesion();

    await act(async () => {
      await result.current.login("admin", "admin123");
    });

    await waitFor(() => expect(result.current.isAdmin).toBe(true));
  });

  test("es falso para un vendedor", async () => {
    api.post.mockResolvedValue({ data: { token: "t", user: VENDEDOR } });
    const { result } = montarSesion();

    await act(async () => {
      await result.current.login("rosa", "rosa123");
    });

    await waitFor(() => expect(result.current.isAdmin).toBe(false));
  });

  test("el rol se toma del usuario que devuelve el servidor, no de lo que se escribió al entrar", async () => {
    // Un cliente no puede promocionarse a administrador: el rol llega firmado en la respuesta
    api.post.mockResolvedValue({ data: { token: "t", user: VENDEDOR } });
    const { result } = montarSesion();

    await act(async () => {
      await result.current.login("rosa", "rosa123");
    });

    await waitFor(() => expect(result.current.user.role).toBe("vendedor"));
  });
});

describe("logout", () => {
  test("limpia el almacenamiento y deja la sesión vacía", async () => {
    localStorage.setItem("token", "token-vivo");
    localStorage.setItem("user", JSON.stringify(ADMIN));
    const { result } = montarSesion();

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    await waitFor(() => expect(result.current.user).toBeNull());
  });
});
