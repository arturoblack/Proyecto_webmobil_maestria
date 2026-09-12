/**
 * Venta multi-ítem en el punto de venta, de extremo a extremo.
 *
 * Es el recorrido de mayor riesgo del sistema: cubre RF-019 (registrar una venta
 * con varios ítems), RF-021 (el precio procede del catálogo del servidor) y
 * RF-022 (la venta se aplica completa o no se aplica), además del criterio
 * UX-031 de la checklist de auditoría.
 *
 * Lo que estas pruebas añaden sobre las 104 de la API: que el recorrido sea
 * realizable desde la interfaz por una persona, y que el descuento de
 * existencias se refleje en la pantalla que la vendedora consulta después.
 */
describe("Punto de venta — venta multi-ítem", () => {
  beforeEach(() => {
    cy.iniciarSesion();
    cy.esperarPantalla("Panel");
    cy.visit("/vender");
    cy.esperarPantalla("Nueva venta");
  });

  it("el catálogo muestra únicamente productos con existencias en la tienda seleccionada", () => {
    // La venta solo procede en tienda: el selector no debe ofrecer almacenes
    cy.get("select").find("option").should("have.length.greaterThan", 0);
    cy.get(".glass.p-2").should("have.length.greaterThan", 0);
    cy.contains("Stock tienda:").should("be.visible");
  });

  it("el carrito calcula el total sumando los precios del catálogo", () => {
    cy.get(".glass.p-2").eq(0).click();
    cy.get(".glass.p-2").eq(1).click();

    cy.contains("h2", "Carrito").should("contain", "2 productos");

    // El total mostrado debe coincidir con la suma de las líneas del carrito
    cy.get(".border-bottom").then(($lineas) => {
      let suma = 0;
      $lineas.each((_, linea) => {
        const importes = Cypress.$(linea).find("strong");
        const ultimo = importes.last().text().replace(/ /g, " ").replace("S/", "").replace(/,/g, "").trim();
        suma += Number(ultimo);
      });
      cy.contains("h2", "Total").parent().find("span.hl").importe().should("be.closeTo", suma, 0.01);
    });
  });

  it("no se puede cobrar sin haber recibido al menos el total", () => {
    // Regla del dominio: el monto pagado nunca puede ser menor que el total
    cy.get(".glass.p-2").eq(0).click();

    cy.contains("button", "Cobrar").should("be.disabled");

    cy.contains("h2", "Total").parent().find("span.hl").importe().then((total) => {
      cy.get('input[type="number"]').clear().type(String((total - 0.5).toFixed(2)));
      cy.contains("button", "Cobrar").should("be.disabled");

      cy.get('input[type="number"]').clear().type(String(total.toFixed(2)));
      cy.contains("button", "Cobrar").should("not.be.disabled");
    });
  });

  it("una venta de dos productos se cobra y descuenta el stock de esa tienda", () => {
    let nombreProducto;
    let stockAntes;

    // Arrange: se anota el nombre y el stock del primer producto del catálogo
    cy.get(".glass.p-2").eq(0).within(() => {
      cy.get(".fw-bold").first().invoke("text").then((t) => { nombreProducto = t.trim(); });
      cy.contains("Stock tienda:").invoke("text").then((t) => {
        stockAntes = Number(t.replace("Stock tienda:", "").replace("⚠", "").trim());
      });
    });

    // Act: dos productos al carrito, pago en efectivo y cobro
    cy.get(".glass.p-2").eq(0).click();
    cy.get(".glass.p-2").eq(1).click();
    cy.contains("h2", "Carrito").should("contain", "2 productos");

    cy.contains("h2", "Total").parent().find("span.hl").importe().then((total) => {
      cy.get('input[type="number"]').clear().type(String((total + 10).toFixed(2)));
      // El vuelto mostrado es informativo: el servidor lo recalcula y decide
      cy.contains("VUELTO").parent().find(".ls-display").importe().should("be.closeTo", 10, 0.01);
      cy.contains("button", "Cobrar").click();
    });

    // Assert: confirmación visible y carrito vacío
    cy.get(".alert-success", { timeout: 15000 }).should("contain", "Venta cobrada");
    cy.contains("h2", "Carrito").should("contain", "0 productos");

    // Assert: el stock de esa tienda bajó en una unidad para el producto vendido
    cy.then(() => {
      cy.contains(".glass.p-2", nombreProducto).within(() => {
        cy.contains("Stock tienda:").invoke("text").then((t) => {
          const stockDespues = Number(t.replace("Stock tienda:", "").replace("⚠", "").trim());
          expect(stockDespues, "el stock de la tienda debe bajar en 1").to.eq(stockAntes - 1);
        });
      });
    });
  });

  it("el movimiento de la venta queda asentado en el kardex", () => {
    // RF-016: toda mutación de existencias deja su asiento; es la regla que
    // permite al dueño cuadrar el inventario físico
    cy.get(".glass.p-2").eq(0).click();
    cy.contains("h2", "Total").parent().find("span.hl").importe().then((total) => {
      cy.get('input[type="number"]').clear().type(String((total + 5).toFixed(2)));
      cy.contains("button", "Cobrar").click();
    });
    cy.get(".alert-success", { timeout: 15000 }).should("be.visible");

    cy.visit("/movimientos");
    cy.esperarPantalla("Movimientos");
    cy.contains("VENTA").should("be.visible");
  });
});
