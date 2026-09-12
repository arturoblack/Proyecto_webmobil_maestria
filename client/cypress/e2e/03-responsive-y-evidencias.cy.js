/**
 * Comportamiento adaptativo en el punto de quiebre de 992 px, y captura de las
 * evidencias visuales que exige la checklist de auditoría UX/UI.
 *
 * Cubre los criterios UX-R01 y UX-R02 de la hoja «Responsive 992 px»: por
 * debajo de 992 px debe usarse la barra inferior y desde 992 px el menú
 * lateral, nunca los dos a la vez. La frontera se prueba en 991 y en 992
 * exactamente, porque un error de «menor que» frente a «menor o igual» solo se
 * manifiesta en ese píxel.
 *
 * Las capturas se guardan en cypress/screenshots y se archivan como evidencia
 * del informe. No sustituyen a la auditoría manual: documentan el estado real
 * de las pantallas en el momento de la ejecución.
 */

const MOVIL = [991, 800];
const ESCRITORIO = [1280, 900];

describe("Diseño adaptativo y evidencias visuales", () => {
  beforeEach(() => {
    cy.iniciarSesion();
    cy.esperarPantalla("Panel de control");
  });

  it("UX-R01 · por debajo de 992 px se usa la barra inferior y no el menú lateral", () => {
    cy.viewport(MOVIL[0], MOVIL[1]);

    cy.get(".bottom-nav").should("be.visible");
    cy.get(".side-nav").should("not.be.visible");
    cy.screenshot("EV-UX-01_panel-movil-991px", { capture: "viewport" });
  });

  it("UX-R01 · desde 992 px se usa el menú lateral y no la barra inferior", () => {
    cy.viewport(992, 800);

    cy.get(".side-nav").should("be.visible");
    cy.get(".bottom-nav").should("not.be.visible");
    cy.screenshot("EV-UX-02_panel-escritorio-992px", { capture: "viewport" });
  });

  it("EV-UX-03 · el inventario muestra el stock por sede y la alerta de mínimos", () => {
    cy.viewport(ESCRITORIO[0], ESCRITORIO[1]);
    cy.visit("/inventario");
    cy.esperarPantalla("Inventario");

    cy.screenshot("EV-UX-03_inventario-por-sede", { capture: "viewport" });
  });

  it("EV-UX-04 · el punto de venta con el carrito cargado y el vuelto calculado", () => {
    cy.viewport(ESCRITORIO[0], ESCRITORIO[1]);
    cy.visit("/vender");
    cy.esperarPantalla("Nueva venta");

    cy.get(".glass.p-2").eq(0).click();
    cy.get(".glass.p-2").eq(1).click();
    cy.contains("h2", "Carrito").should("contain", "2 productos");

    cy.contains("h2", "Total").parent().find("span.hl").importe().then((total) => {
      cy.get('input[type="number"]').clear().type(String((total + 20).toFixed(2)));
    });

    cy.screenshot("EV-UX-04_punto-de-venta-carrito", { capture: "viewport" });
  });

  it("EV-UX-05 · el kardex refleja los movimientos con su tipo y su autor", () => {
    cy.viewport(ESCRITORIO[0], ESCRITORIO[1]);
    cy.visit("/movimientos");
    cy.esperarPantalla("Movimientos");

    cy.contains("VENTA").should("be.visible");
    cy.screenshot("EV-UX-05_kardex-movimientos", { capture: "viewport" });
  });
});
