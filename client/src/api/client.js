import axios from "axios";

// Única instancia HTTP de toda la aplicación (estándar 5.1): el token se inyecta aquí
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Ante un 401 la sesión ya no es válida: se limpia y se vuelve al inicio de sesión
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes("/auth/login")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

// Traduce cualquier error de la API al mensaje del contrato uniforme { message }
export const apiMessage = (error) =>
  error.response?.data?.message || "No se pudo conectar con el servidor";

export default api;
