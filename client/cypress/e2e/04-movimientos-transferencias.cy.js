/**
 * Entradas, salidas y transferencias registradas a mano, y su rastro en el kardex.
 *
 * Cubre RF-07 y RF-08 de la memoria técnica (movimientos manuales del
 * administrador), RF-016 (toda mutación de existencias deja su asiento), RF-017
 * (el stock nunca queda negativo), RF-018 (la transferencia descuenta en el
 * origen y abona en el destino, o no hace nada) y RF-09 de la memoria (consulta
 * del kardex), además de RNF-003 en lo que toca a los mensajes de rechazo.
 *
 * inventory.api.test.js ya prueba estas reglas contra la API. Aquí se comprueba
 * lo que el dueño de la librería hace de verdad: registra el movimiento en un
 * formulario y luego abre Inventario y Movimientos para ver si cuadra. Por eso
 * los saldos se leen de la pantalla de Inventario y no de la base de datos.
 *
 * Cada caso usa un producto propio con saldos conocidos (20 en el almacén y 5 en
 * la tienda), así que ni la spec de ventas ni una ejecución anterior lo alteran.
 */
describe("Movimientos de inventario — entradas, salidas y transferencias", () => {
  const STOCK_ALMACEN = 20;
  const STOCK_TIENDA = 5;

  let producto;

  const abrirFormularioDeMovimiento = () => {
    cy.visit("/movimientos");
    cy.esperarPantalla("Movimientos");
    cy.contains("button", "Registrar").click();
    cy.contains(".modal-title", "Registrar movimiento").should("be.visible");
  };

  // Llena solo los campos que se le pasan: los ausentes quedan como los dejaría
  // una persona que se los saltó, que es justo lo que algunas pruebas necesitan
  const llenarMovimiento = ({ tipo, origen, destino, cantidad, motivo }) => {
    cy.campo("Tipo").select(tipo);
    // Las listas llegan de la API: se espera a que traigan la opción antes de elegirla
    cy.campo("Producto").should("contain", producto.nombre).select(producto.nombre);
    if (origen) cy.campo("Origen").should("contain", origen).select(origen);
    if (destino) cy.campo("Destino").should("contain", destino).select(destino);
    cy.campo("Cantidad").clear().type(String(cantidad));
    if (motivo) cy.campo("Motivo").type(motivo);
  };

  const guardarMovimiento = () => cy.contains("button", "Guardar movimiento").click();

  // Los asientos del kardex que nombran al producto de esta prueba
  const asientosDelProducto = () => cy.get(".glass.p-3").filter(`:contains("${producto.nombre}")`);

  // Aplica un filtro por tipo y espera a que la lista filtrada esté pintada: contar
  // asientos mientras la pantalla aún carga daría un cero que no significa nada
  const filtrarKardex = (tipo) => {
    cy.intercept("GET", `**/api/movements?type=${tipo}*`).as(`kardex-${tipo}`);
    cy.contains("button", tipo).click();
    cy.wait(`@kardex-${tipo}`);
    cy.get(".spinner-border").should("not.exist");
  };

  beforeEach(() => {
    cy.prepararProducto({ nombre: "Archivador lomo ancho", stockAlmacen: STOCK_ALMACEN, stockTienda: STOCK_TIENDA }).then((preparado) => {
      producto = preparado;
    });
    cy.iniciarSesion();
    cy.esperarPantalla("Panel");
  });

  it("una entrada aumenta el stock de la sede de destino y deja intacta la otra sede", () => {
    abrirFormularioDeMovimiento();

    llenarMovimiento({ tipo: "entrada", destino: producto.almacen.nombre, cantidad: 12, motivo: "Compra directa en Mesa Redonda" });
    guardarMovimiento();

    cy.get(".modal").should("not.exist");
    cy.stockEnSede(producto.sku, producto.almacen.nombre).should("eq", STOCK_ALMACEN + 12);
    // El stock es del par producto–sede: la tienda no recibe nada de esta entrada
    cy.stockEnSede(producto.sku, producto.tienda.nombre).should("eq", STOCK_TIENDA);
  });

  it("una salida mayor que el stock se rechaza, dice cuántas unidades hay y no altera el saldo", () => {
    abrirFormularioDeMovimiento();

    llenarMovimiento({ tipo: "salida", origen: producto.tienda.nombre, cantidad: STOCK_TIENDA + 1, motivo: "Merma por humedad" });
    guardarMovimiento();

    // Assert: el rechazo informa el saldo real para que la persona corrija la cantidad
    cy.get(".modal .alert-danger")
      .should("be.visible")
      .and("contain", "Stock insuficiente")
      .and("contain", `solo hay ${STOCK_TIENDA} unidades`);
    cy.contains(".modal-title", "Registrar movimiento").should("be.visible");

    // Assert: ni el saldo ni el kardex registran la salida rechazada
    cy.stockEnSede(producto.sku, producto.tienda.nombre).should("eq", STOCK_TIENDA);
    cy.visit("/movimientos");
    cy.esperarPantalla("Movimientos");
    filtrarKardex("salida");
    asientosDelProducto().should("have.length", 0);
  });

  it("una transferencia del almacén a la tienda conserva las unidades totales", () => {
    const total = STOCK_ALMACEN + STOCK_TIENDA;
    abrirFormularioDeMovimiento();

    llenarMovimiento({
      tipo: "transferencia",
      origen: producto.almacen.nombre,
      destino: producto.tienda.nombre,
      cantidad: 8,
      motivo: "Reposición de campaña escolar",
    });
    guardarMovimiento();

    cy.get(".modal").should("not.exist");
    cy.stockEnSede(producto.sku, producto.almacen.nombre).then((enAlmacen) => {
      cy.stockEnSede(producto.sku, producto.tienda.nombre).then((enTienda) => {
        expect(enAlmacen, "el almacén entrega 8 unidades").to.eq(STOCK_ALMACEN - 8);
        expect(enTienda, "la tienda recibe las mismas 8").to.eq(STOCK_TIENDA + 8);
        expect(enAlmacen + enTienda, "una transferencia no crea ni destruye unidades").to.eq(total);
      });
    });
  });

  it("una transferencia mayor que el stock del origen no mueve nada en ninguna de las dos sedes", () => {
    // RF-018: si el descuento en origen falla, el abono en destino tampoco ocurre
    abrirFormularioDeMovimiento();

    llenarMovimiento({
      tipo: "transferencia",
      origen: producto.almacen.nombre,
      destino: producto.tienda.nombre,
      cantidad: STOCK_ALMACEN + 1,
    });
    guardarMovimiento();

    cy.get(".modal .alert-danger").should("be.visible").and("contain", "Stock insuficiente");
    cy.stockEnSede(producto.sku, producto.almacen.nombre).should("eq", STOCK_ALMACEN);
    cy.stockEnSede(producto.sku, producto.tienda.nombre).should("eq", STOCK_TIENDA);
  });

  it("una transferencia con la misma sede como origen y destino se rechaza en el formulario", () => {
    abrirFormularioDeMovimiento();

    llenarMovimiento({
      tipo: "transferencia",
      origen: producto.almacen.nombre,
      destino: producto.almacen.nombre,
      cantidad: 3,
    });
    guardarMovimiento();

    cy.get(".modal .alert-danger")
      .should("be.visible")
      .and("contain", "El origen y el destino de una transferencia deben ser distintos");
    cy.contains(".modal-title", "Registrar movimiento").should("be.visible");
  });

  it("el kardex muestra el asiento de la transferencia con cantidad, sedes, motivo y responsable", () => {
    // RF-016: el asiento es lo que permite reconstruir quién movió qué y por qué
    abrirFormularioDeMovimiento();
    llenarMovimiento({
      tipo: "transferencia",
      origen: producto.almacen.nombre,
      destino: producto.tienda.nombre,
      cantidad: 4,
      motivo: "Pedido del colegio San Ramón",
    });
    guardarMovimiento();
    cy.get(".modal").should("not.exist");

    // El asiento aparece sin recargar, porque la pantalla se refresca al guardar
    asientosDelProducto()
      .first()
      .should("contain", "TRANSFERENCIA")
      .and("contain", `4× ${producto.nombre}`)
      .and("contain", `${producto.almacen.nombre} → ${producto.tienda.nombre}`)
      .and("contain", "motivo: Pedido del colegio San Ramón")
      .and("contain", producto.sesion.nombreUsuario);

    // Y el filtro por tipo lo separa de los saldos iniciales, que entraron como ENTRADA
    filtrarKardex("transferencia");
    asientosDelProducto().should("have.length", 1);
    filtrarKardex("entrada");
    asientosDelProducto().should("have.length", 2).and("contain", "Saldo inicial de la prueba");
  });
});
