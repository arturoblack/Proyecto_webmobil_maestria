import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Instancia única de Axios y tratamiento de la sesión expirada (RNF-006).
 *
 * Se prueba a través de la propia instancia, sustituyendo el adaptador de red:
 * así se ejerce la cadena real de interceptores en lugar de llamar a mano a
 * funciones internas de Axios, que es lo que haría frágil la prueba.
 */

let asignarUrl;
let locationOriginal;

// Devuelve el módulo recién evaluado: los interceptores se registran al importarlo
const cargarCliente = async () => {
  vi.resetModules();
  return import("../src/api/client");
};

// Adaptador falso: responde 200 y deja ver la configuración ya interceptada
const adaptadorCorrecto = (capturadas) => (config) => {
  capturadas.push(config);
  return Promise.resolve({ data: { ok: true }, status: 200, statusText: "OK", headers: {}, config });
};

// Adaptador falso que simula la respuesta de error indicada por la API
const adaptadorConError = (status, message) => (config) => {
  const error = new Error("Fallo simulado de la API");
  error.config = config;
  error.response = { status, data: message === undefined ? undefined : { message }, config };
  return Promise.reject(error);
};

const leerCabecera = (config, nombre) =>
  typeof config.headers?.get === "function" ? config.headers.get(nombre) : config.headers?.[nombre];

beforeEach(() => {
  asignarUrl = vi.fn();
  locationOriginal = window.location;
  // jsdom no implementa la navegación: se sustituye para poder observarla
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { assign: asignarUrl, href: "http://localhost/" },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: locationOriginal,
  });
});

describe("interceptor de petición — inyección del token", () => {
  test("añade la cabecera Authorization cuando hay token guardado", async () => {
    localStorage.setItem("token", "un-token-de-prueba");
    const { default: api } = await cargarCliente();
    const capturadas = [];
    api.defaults.adapter = adaptadorCorrecto(capturadas);

    await api.get("/api/stocks");

    expect(leerCabecera(capturadas[0], "Authorization")).toBe("Bearer un-token-de-prueba");
  });

  test("no añade la cabecera cuando no hay sesión", async () => {
    const { default: api } = await cargarCliente();
    const capturadas = [];
    api.defaults.adapter = adaptadorCorrecto(capturadas);

    await api.get("/api/stocks");

    expect(leerCabecera(capturadas[0], "Authorization")).toBeFalsy();
  });

  test("el token se lee en cada petición, no se congela al importar el módulo", async () => {
    // Si se leyera una sola vez, la primera petición tras iniciar sesión iría sin token
    const { default: api } = await cargarCliente();
    const capturadas = [];
    api.defaults.adapter = adaptadorCorrecto(capturadas);

    await api.get("/api/stats");
    localStorage.setItem("token", "token-posterior");
    await api.get("/api/stats");

    expect(leerCabecera(capturadas[0], "Authorization")).toBeFalsy();
    expect(leerCabecera(capturadas[1], "Authorization")).toBe("Bearer token-posterior");
  });
});

describe("interceptor de respuesta — sesión expirada", () => {
  test("un 401 en una ruta protegida limpia la sesión y vuelve al inicio de sesión", async () => {
    localStorage.setItem("token", "token-caducado");
    localStorage.setItem("user", JSON.stringify({ username: "rosa" }));
    const { default: api } = await cargarCliente();
    api.defaults.adapter = adaptadorConError(401, "Acceso denegado: falta el token");

    await expect(api.get("/api/stocks")).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(asignarUrl).toHaveBeenCalledWith("/login");
  });

  test("un 401 del propio inicio de sesión NO redirige: son credenciales incorrectas", async () => {
    // Si redirigiera, el usuario nunca llegaría a ver el mensaje de error del formulario
    const { default: api } = await cargarCliente();
    api.defaults.adapter = adaptadorConError(401, "Credenciales incorrectas");

    await expect(api.post("/api/auth/login", {})).rejects.toBeTruthy();

    expect(asignarUrl).not.toHaveBeenCalled();
  });

  test("un 403 no cierra la sesión: el usuario sigue autenticado, solo le falta permiso", async () => {
    localStorage.setItem("token", "token-de-vendedor");
    const { default: api } = await cargarCliente();
    api.defaults.adapter = adaptadorConError(403, "Se requiere permiso de administrador");

    await expect(api.get("/api/users")).rejects.toBeTruthy();

    expect(localStorage.getItem("token")).toBe("token-de-vendedor");
    expect(asignarUrl).not.toHaveBeenCalled();
  });

  test("una respuesta correcta atraviesa el interceptor sin alterarse", async () => {
    const { default: api } = await cargarCliente();
    api.defaults.adapter = adaptadorCorrecto([]);

    const respuesta = await api.get("/api/stats");

    expect(respuesta.data).toEqual({ ok: true });
  });
});

describe("apiMessage — contrato uniforme de errores (RNF-003)", () => {
  test("devuelve el mensaje que envía la API", async () => {
    const { apiMessage } = await cargarCliente();
    const error = { response: { data: { message: "El stock no puede ser negativo" } } };

    expect(apiMessage(error)).toBe("El stock no puede ser negativo");
  });

  test("ante un fallo de red devuelve un mensaje comprensible, no «undefined»", async () => {
    const { apiMessage } = await cargarCliente();

    expect(apiMessage(new Error("Network Error"))).toBe("No se pudo conectar con el servidor");
  });

  test("una respuesta de error sin cuerpo también produce mensaje", async () => {
    const { apiMessage } = await cargarCliente();

    expect(apiMessage({ response: { status: 500 } })).toBe("No se pudo conectar con el servidor");
  });
});
