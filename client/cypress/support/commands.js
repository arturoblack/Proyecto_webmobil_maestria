/**
 * Comandos reutilizables de la suite End-to-End.
 *
 * Las credenciales NO se escriben aquí: se leen de cypress.env.json (ignorado
 * por git) o de variables CYPRESS_*, de modo que ningún archivo versionado
 * contenga una contraseña, aunque sea la del seed de demostración.
 *
 * Cypress 16 eliminó Cypress.env(): los valores sensibles se obtienen con
 * cy.env([...]), que recibe una lista de claves y resuelve en la cadena.
 */

// Inicia sesión a través de la interfaz real, como lo haría una persona.
// No se falsifica el token en localStorage: eso probaría el atajo, no el sistema.
Cypress.Commands.add("iniciarSesion", (usuario, clave) => {
  cy.env(["usuario", "clave"]).then(({ usuario: usuarioSeed, clave: claveSeed }) => {
    const username = usuario ?? usuarioSeed;
    const password = clave ?? claveSeed;

    cy.visit("/login");
    cy.get("form").find("input").first().type(username);
    cy.get('input[type="password"]').type(password, { log: false });
    cy.contains("button", "Ingresar").click();
  });
});

// Espera a que una pantalla protegida haya cargado, evitando aserciones
// sobre un DOM todavía en estado de carga.
Cypress.Commands.add("esperarPantalla", (titulo) => {
  cy.contains("h1", titulo, { timeout: 15000 }).should("be.visible");
});

// Lee un importe mostrado en soles y lo devuelve como número.
// Intl separa el símbolo con espacio duro, que hay que normalizar.
Cypress.Commands.add("importe", { prevSubject: true }, (subject) => {
  const texto = subject
    .text()
    .replace(/ /g, " ")
    .replace("S/", "")
    .replace(/,/g, "")
    .trim();
  return cy.wrap(Number(texto));
});
