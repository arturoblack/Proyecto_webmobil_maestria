import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { RequireAdmin, RequireAuth } from "../src/components/ProtectedRoute";
import { AuthProvider } from "../src/context/AuthContext";

/**
 * Guardianes de ruta del cliente (RF-003 en su vertiente de interfaz).
 *
 * IMPORTANTE para la lectura de estas pruebas: verifican comodidad de uso, no
 * seguridad. El control real vive en el servidor, que revalida el rol en cada
 * petición con requireAdmin y responde 403 —eso está cubierto por las 42 pruebas
 * de authorization.api.test.js—. Que el cliente esconda una opción no impide a
 * nadie llamar al endpoint directamente.
 */

const ADMIN = { _id: "1", username: "admin", role: "admin" };
const VENDEDOR = { _id: "2", username: "rosa", role: "vendedor" };

// Monta el guardián sobre /privado y deja observables los dos destinos de redirección
function renderizarGuardian(guardian, usuario) {
  if (usuario) localStorage.setItem("user", JSON.stringify(usuario));
  return render(
    <MemoryRouter initialEntries={["/privado"]}>
      <AuthProvider>
        <Routes>
          <Route path="/privado" element={guardian} />
          <Route path="/login" element={<p>pantalla de inicio de sesión</p>} />
          <Route path="/" element={<p>panel principal</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

const contenidoProtegido = <p>contenido protegido</p>;

describe("RequireAuth — exige sesión iniciada", () => {
  test("sin sesión lleva al inicio de sesión", () => {
    renderizarGuardian(<RequireAuth>{contenidoProtegido}</RequireAuth>, null);

    expect(screen.getByText("pantalla de inicio de sesión")).toBeInTheDocument();
    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument();
  });

  test("con sesión de vendedor muestra el contenido", () => {
    renderizarGuardian(<RequireAuth>{contenidoProtegido}</RequireAuth>, VENDEDOR);

    expect(screen.getByText("contenido protegido")).toBeInTheDocument();
  });

  test("con sesión de administrador muestra el contenido", () => {
    renderizarGuardian(<RequireAuth>{contenidoProtegido}</RequireAuth>, ADMIN);

    expect(screen.getByText("contenido protegido")).toBeInTheDocument();
  });
});

describe("RequireAdmin — exige rol de administrador", () => {
  test("sin sesión lleva al inicio de sesión, no al panel", () => {
    renderizarGuardian(<RequireAdmin>{contenidoProtegido}</RequireAdmin>, null);

    expect(screen.getByText("pantalla de inicio de sesión")).toBeInTheDocument();
  });

  test("un vendedor es devuelto al panel principal y no ve el contenido", () => {
    renderizarGuardian(<RequireAdmin>{contenidoProtegido}</RequireAdmin>, VENDEDOR);

    expect(screen.getByText("panel principal")).toBeInTheDocument();
    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument();
  });

  test("un administrador ve el contenido", () => {
    renderizarGuardian(<RequireAdmin>{contenidoProtegido}</RequireAdmin>, ADMIN);

    expect(screen.getByText("contenido protegido")).toBeInTheDocument();
  });

  test("un rol desconocido se trata como no autorizado", () => {
    // Defensa ante un token manipulado o un rol futuro todavía no contemplado
    renderizarGuardian(<RequireAdmin>{contenidoProtegido}</RequireAdmin>, {
      _id: "3",
      username: "intruso",
      role: "supervisor",
    });

    expect(screen.getByText("panel principal")).toBeInTheDocument();
    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument();
  });
});
