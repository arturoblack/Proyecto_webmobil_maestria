import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// La ocultación del menú nunca es el único control: el servidor revalida el rol en cada petición
export function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export function RequireAdmin({ children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return isAdmin ? children : <Navigate to="/" replace />;
}
