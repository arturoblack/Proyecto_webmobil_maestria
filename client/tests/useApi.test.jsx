import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Solo se sustituye la traducción del error; el hook no debe conocer la red
vi.mock("../src/api/client", () => ({
  default: {},
  apiMessage: (error) => error?.response?.data?.message || "No se pudo conectar con el servidor",
}));

const { useApi } = await import("../src/hooks/useApi");

/**
 * Estados uniformes de carga, error y datos para todo consumo de la API
 * (estándar 5.1 del proyecto). Es el hook del que dependen las diez pantallas:
 * si pierde un estado, todas lo pierden a la vez.
 */

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ciclo de vida de una petición", () => {
  test("empieza cargando y sin datos", () => {
    const fetcher = vi.fn(() => new Promise(() => {}));

    const { result } = renderHook(() => useApi(fetcher, []));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("");
  });

  test("al resolver expone los datos y deja de cargar", async () => {
    const productos = [{ sku: "CUA-001", name: "Cuaderno A4" }];
    const fetcher = vi.fn().mockResolvedValue({ data: productos });

    const { result } = renderHook(() => useApi(fetcher, []));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(productos);
    expect(result.current.error).toBe("");
  });

  test("pide los datos una sola vez al montarse", async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: [] });

    renderHook(() => useApi(fetcher, []));

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  });
});

describe("tratamiento del error", () => {
  test("traduce el mensaje del contrato uniforme de la API", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue({ response: { data: { message: "Registro de existencias no encontrado" } } });

    const { result } = renderHook(() => useApi(fetcher, []));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Registro de existencias no encontrado");
  });

  test("un fallo de red produce un mensaje legible, no una excepción sin capturar", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useApi(fetcher, []));

    await waitFor(() => expect(result.current.error).toBe("No se pudo conectar con el servidor"));
  });

  test("tras un error deja de cargar: la pantalla no se queda en un spinner eterno", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useApi(fetcher, []));

    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

describe("refresh", () => {
  test("vuelve a pedir los datos y refleja el nuevo resultado", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ quantity: 10 }] })
      .mockResolvedValueOnce({ data: [{ quantity: 7 }] });

    const { result } = renderHook(() => useApi(fetcher, []));
    await waitFor(() => expect(result.current.data).toEqual([{ quantity: 10 }]));

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual([{ quantity: 7 }]);
  });

  test("limpia el error anterior al reintentar con éxito", async () => {
    // Tras una venta fallida por falta de stock, reintentar debe borrar el aviso previo
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce({ response: { data: { message: "Stock insuficiente" } } })
      .mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useApi(fetcher, []));
    await waitFor(() => expect(result.current.error).toBe("Stock insuficiente"));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBe("");
  });
});
