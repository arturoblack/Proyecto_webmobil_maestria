import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "./apiMock";
import { AuthProvider } from "../../src/context/AuthContext";

export const ADMIN = { id: "u1", _id: "u1", username: "admin", name: "Iván Bolaños", role: "admin" };
export const VENDEDOR = { id: "u2", _id: "u2", username: "rosa", name: "Rosa Quispe", role: "vendedor" };

export const ALMACEN = { _id: "l1", name: "Almacén Central", type: "almacen" };
export const TIENDA = { _id: "l2", name: "Tienda Jr. Lima", type: "tienda" };
export const CUADERNO = { _id: "p1", name: "Cuaderno A4", sku: "CUA-001", category: "Cuadernos", price: 12.5, description: "100 hojas" };
export const LAPICERO = { _id: "p2", name: "Lapicero azul", sku: "LAP-002", category: "Escritura", price: 1.5 };

// Responde api.get según la URL pedida; una URL no declarada falla, como haría la API real
export function mockRoutes(routes) {
  api.get.mockImplementation((url) => {
    if (url in routes) {
      const value = routes[url];
      return value instanceof Error
        ? Promise.reject({ response: { data: { message: value.message } } })
        : Promise.resolve({ data: value });
    }
    return Promise.reject(new Error(`ruta sin mock: ${url}`));
  });
}

export const apiError = (message) => ({ response: { data: { message } } });

// Monta una pantalla con sesión iniciada dentro del router, como en la aplicación
export function renderPage(element, { user = ADMIN, path = "/" } = {}) {
  if (user) localStorage.setItem("user", JSON.stringify(user));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path={path} element={element} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}
