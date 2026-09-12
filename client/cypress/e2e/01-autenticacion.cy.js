/**
 * Inicio de sesión y protección de rutas desde el navegador real.
 *
 * Cubre RF-001, RF-002 y RF-003 en su vertiente de interfaz, y los criterios
 * UX-002 y UX-003 de la checklist de auditoría: que el usuario sepa dónde está
 * y que los errores se expliquen en su idioma, no con un código HTTP.
 *
 * El control de acceso real vive en el servidor y está cubierto por las 42
 * pruebas de authorization.api.test.js. Aquí se verifica que la interfaz no
 * deje al usuario en un estado incoherente.
 */
describe("Autenticación y protección de rutas", () => {
  it("un usuario sin sesión que entra por URL directa acaba en el inicio de sesión", () => {
    // Criterio UX: nadie debe quedarse mirando una pantalla vacía
    cy.visit("/inventario");

    cy.location("pathname").should("eq", "/login");
    cy.contains("Ingresar").should("be.visible");
  });

  it("las credenciales correctas llevan al panel principal", () => {
    cy.iniciarSesion();

    cy.location("pathname").should("eq", "/");
    cy.contains("LibreStock").should("be.visible");
  });

  it("una contraseña incorrecta muestra un mensaje comprensible y no un código HTTP", () => {
    cy.iniciarSesion(undefined, "clave-que-no-es");

    cy.get(".alert-danger").should("be.visible").invoke("text").should((texto) => {
      expect(texto.trim()).to.not.be.empty;
      // El usuario no debe leer «400» ni «Request failed»
      expect(texto).to.not.match(/\b(400|401|500|Request failed|undefined)\b/);
    });
    cy.location("pathname").should("eq", "/login");
  });

  it("un usuario inexistente produce el mismo mensaje que una contraseña incorrecta", () => {
    // RNF-002: si los mensajes difirieran, se podrían enumerar cuentas desde el navegador
    cy.iniciarSesion(undefined, "clave-que-no-es");
    cy.get(".alert-danger").invoke("text").then((mensajeClaveMala) => {
      cy.iniciarSesion("usuario-que-no-existe", "cualquier-clave");
      cy.get(".alert-danger").invoke("text").should("eq", mensajeClaveMala);
    });
  });

  it("la sesión sobrevive a una recarga de la página", () => {
    // Sin rehidratación del usuario, recargar expulsaría de la sesión
    cy.iniciarSesion();
    cy.location("pathname").should("eq", "/");

    cy.reload();

    cy.location("pathname").should("eq", "/");
    cy.contains("Ingresar").should("not.exist");
  });
});
