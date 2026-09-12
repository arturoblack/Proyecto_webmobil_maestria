import { vi } from "vitest";

// Sustituto de la única instancia de Axios: las pantallas se prueban sin red.
// Cada archivo de pruebas recibe su propia copia (Vitest aísla módulos por archivo).
const api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };

export const apiMessage = (error) => error?.response?.data?.message || "No se pudo conectar con el servidor";

export default api;
