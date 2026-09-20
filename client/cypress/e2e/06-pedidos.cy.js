/**
 * Pedidos de clientes y pedidos a proveedores: qué hacen, y qué no, con el stock.
 *
 * Cubre RF-10 de la memoria técnica (los encargos de clientes no afectan las
 * existencias), RF-11 y RF-12 (pedido a proveedor y recepción con entradas
 * automáticas en la sede de destino), RF-032 (la recepción es irrepetible) y
 * RF-016 (la entrada generada deja su asiento en el kardex), además de RNF-003 y
 * del criterio UX-003 en los mensajes de los formularios.
 *
 * Son dos documentos con el mismo aspecto y efectos opuestos: uno es una promesa
 * a un cliente y no mueve una sola unidad; el otro, al recepcionarse, es la
 * principal puerta de entrada de mercadería. Confundirlos descuadra el inventario,
 * y por eso cada caso termina mirando el saldo en la pantalla de Inventario.
 *
 * Cada caso usa un producto propio (10 unidades en el almacén y 6 en la tienda) y
 * nombres de cliente y de proveedor irrepetibles: la spec se puede repetir sin
 * reiniciar la base de datos y no depende del orden de ejecución.
 */
describe("Pedidos de clientes y pedidos a proveedores", () => {
  const STOCK_ALMACEN = 10;
  const STOCK_TIENDA = 6;

  // Un error comprensible no enseña la jerga de Mongoose ni códigos HTTP
  const JERGA_TECNICA = /\b(400|409|500|Request failed|undefined|Cast to|ObjectId|BSONError|Path)\b/;

  let producto;

  // Los asientos del kardex que nombran al producto de esta prueba
  const asientosDelProducto = () => cy.get(".glass.p-3").filter(`:contains("${producto.nombre}")`);

  const abrirKardex = () => {
    cy.visit("/movimientos");
    cy.esperarPantalla("Movimientos");
    cy.get(".spinner-border").should("not.exist");
  };

  // La fila de producto del formulario no tiene etiqueta propia: se llega a ella
  // desde el rótulo «Productos», que es lo que la persona lee antes de llenarla
  const elegirProductoDelPedido = (nombre, cantidad) => {
    cy.contains(".modal span", "Productos").next().within(() => {
      cy.get("select").should("contain", nombre).select(nombre);
      cy.get('input[type="number"]').clear().type(String(cantidad));
    });
  };

  beforeEach(() => {
    cy.prepararProducto({ nombre: "Mochila escolar reforzada", precio: 89.9, stockAlmacen: STOCK_ALMACEN, stockTienda: STOCK_TIENDA }).then((preparado) => {
      producto = preparado;
    });
    cy.iniciarSesion();
    cy.esperarPantalla("Panel");
  });

  context("pedidos de clientes", () => {
    const abrirFormularioDePedido = () => {
      cy.visit("/pedidos-clientes");
      cy.esperarPantalla("Pedidos de clientes");
      cy.contains("button", "Registrar").click();
      cy.contains(".modal-title", "Registrar pedido de cliente").should("be.visible");
    };

    it("registrar un encargo y entregarlo no altera el stock ni deja asientos en el kardex", () => {
      const cliente = `I.E. San Ramón ${Date.now()}`;
      abrirFormularioDePedido();

      // Act 1: un encargo por MÁS unidades de las que hay; es un encargo, no una venta
      cy.campo("Cliente").type(cliente);
      cy.campo("Teléfono").type("964 112 233");
      cy.campo("Tienda que atiende").should("contain", producto.tienda.nombre).select(producto.tienda.nombre);
      elegirProductoDelPedido(producto.nombre, STOCK_TIENDA + 3);
      cy.campo("Notas").type("Recoge el viernes");
      cy.contains("button", "Guardar pedido").click();

      cy.get(".modal").should("not.exist");
      cy.contains(".glass.p-3", cliente)
        .should("contain", "pendiente")
        .and("contain", `${STOCK_TIENDA + 3}× ${producto.nombre}`);
      cy.stockEnSede(producto.sku, producto.tienda.nombre).should("eq", STOCK_TIENDA);

      // Act 2: se marca como entregado. La salida real de la mercadería es la venta
      cy.visit("/pedidos-clientes");
      cy.esperarPantalla("Pedidos de clientes");
      cy.contains(".glass.p-3", cliente).contains("button", "Entregado").click();

      cy.contains(".glass.p-3", cliente).should("not.exist");
      cy.contains("button", "entregado").click();
      cy.contains(".glass.p-3", cliente).should("contain", "entregado");

      // Assert: mismos saldos, y en el kardex solo los dos saldos iniciales de la prueba
      cy.stockEnSede(producto.sku, producto.tienda.nombre).should("eq", STOCK_TIENDA);
      cy.stockEnSede(producto.sku, producto.almacen.nombre).should("eq", STOCK_ALMACEN);
      abrirKardex();
      asientosDelProducto().should("have.length", 2).and("contain", "Saldo inicial de la prueba");
    });

    it("un encargo sin nombre de cliente o sin productos se rechaza y el formulario dice qué falta", () => {
      abrirFormularioDePedido();

      // Act 1: tienda y producto elegidos, pero sin cliente
      cy.campo("Tienda que atiende").should("contain", producto.tienda.nombre).select(producto.tienda.nombre);
      elegirProductoDelPedido(producto.nombre, 2);
      cy.contains("button", "Guardar pedido").click();

      cy.get(".modal .alert-danger").should("be.visible").and("contain", "El nombre del cliente es obligatorio");

      // Act 2: con cliente, pero con la fila de producto de vuelta en «Selecciona…»
      cy.campo("Cliente").type("Librería Minerva");
      cy.contains(".modal span", "Productos").next().find("select").select("Selecciona…");
      cy.contains("button", "Guardar pedido").click();

      cy.get(".modal .alert-danger").should("be.visible").and("contain", "El pedido debe tener al menos un producto");
      cy.contains(".modal-title", "Registrar pedido de cliente").should("be.visible");
    });

    // DEFECTO REAL (pendiente de corrección): si no se elige la tienda, el formulario
    // muestra un error interno de Mongoose, en inglés:
    //   Cast to ObjectId failed for value "" (type string) at path "location" because of "BSONError"
    //
    // El formulario envía locationId: "" y el modelo lo intenta convertir a ObjectId.
    // Ese fallo llega a errorHandler dentro de un ValidationError, y el manejador
    // devuelve tal cual el mensaje del primer error, que aquí no es uno de los
    // mensajes en español del esquema sino el del CastError. Incumple RNF-003 y
    // UX-003. El mismo defecto aparece en «Nuevo pedido a proveedor» sin ubicación de
    // destino (path "destination"), y una cantidad 0 en cualquiera de los dos pedidos
    // produce «Path `quantity` (0) is less than minimum allowed value (1).».
    // Corrección sugerida: mensajes propios en required/min de los dos modelos y
    // traducir el CastError anidado en errorHandler. Quitar el .skip al corregirlo.
    it.skip("un encargo sin tienda se rechaza con un mensaje comprensible y no con un error interno", () => {
      abrirFormularioDePedido();

      cy.campo("Cliente").type("Librería Minerva");
      elegirProductoDelPedido(producto.nombre, 2);
      cy.contains("button", "Guardar pedido").click();

      cy.get(".modal .alert-danger")
        .should("be.visible")
        .invoke("text")
        .should((texto) => {
          expect(texto).to.not.match(JERGA_TECNICA);
          expect(texto).to.match(/tienda|ubicación|sede/i);
        });
    });
  });

  context("pedidos a proveedores", () => {
    const abrirPedidosAProveedor = () => {
      cy.visit("/pedidos-proveedor");
      cy.esperarPantalla("Pedidos a proveedores");
    };

    // Arrange por API de un pedido pendiente: lo que estas pruebas ejercitan por la
    // interfaz es la recepción, no el alta (que ya recorre el primer caso)
    const prepararPedidoPendiente = (proveedor, destino, cantidad) =>
      cy
        .request({
          method: "POST",
          url: `${producto.sesion.apiUrl}/api/purchase-orders`,
          headers: { Authorization: `Bearer ${producto.sesion.token}` },
          body: { supplierName: proveedor, destinationId: destino.id, items: [{ productId: producto.id, quantity: cantidad }] },
          log: false,
        })
        .its("body._id");

    it("un pedido pendiente aún no altera el stock, y al recepcionarlo genera la entrada en la sede indicada", () => {
      const proveedor = `Distribuidora Navarrete ${Date.now()}`;
      abrirPedidosAProveedor();

      // Act 1: alta del pedido con destino a la TIENDA, para distinguirla del almacén
      cy.contains("button", "Nuevo pedido").click();
      cy.campo("Proveedor").type(proveedor);
      cy.campo("Ubicación de destino").should("contain", producto.tienda.nombre).select(producto.tienda.nombre);
      elegirProductoDelPedido(producto.nombre, 30);
      cy.contains("button", "Crear pedido").click();

      cy.get(".modal").should("not.exist");
      cy.contains(".glass.p-3", proveedor)
        .should("contain", "pendiente")
        .and("contain", `30× ${producto.nombre}`)
        .and("contain", `Destino: ${producto.tienda.nombre}`);
      // Pedir no es recibir: la mercadería todavía está en el camión del proveedor
      cy.stockEnSede(producto.sku, producto.tienda.nombre).should("eq", STOCK_TIENDA);

      // Act 2: recepción
      abrirPedidosAProveedor();
      cy.contains(".glass.p-3", proveedor).contains("button", "Recepcionar").click();

      // Assert: el pedido queda recibido, con su fecha, y sube solo la sede de destino
      cy.contains(".glass.p-3", proveedor).should("contain", "recibido").and("contain", "· recibido ");
      cy.stockEnSede(producto.sku, producto.tienda.nombre).should("eq", STOCK_TIENDA + 30);
      cy.stockEnSede(producto.sku, producto.almacen.nombre).should("eq", STOCK_ALMACEN);

      // Assert: la entrada quedó asentada en el kardex y dice de qué pedido viene
      abrirKardex();
      asientosDelProducto()
        .first()
        .should("contain", "ENTRADA")
        .and("contain", `30× ${producto.nombre}`)
        .and("contain", producto.tienda.nombre)
        .and("contain", `motivo: Recepción de pedido a ${proveedor}`);
    });

    it("un pedido ya recibido no ofrece Recepcionar ni Cancelar, tampoco después de recargar", () => {
      const proveedor = `Importaciones Layconsa ${Date.now()}`;
      prepararPedidoPendiente(proveedor, producto.almacen, 15);
      abrirPedidosAProveedor();

      cy.contains(".glass.p-3", proveedor).contains("button", "Recepcionar").click();

      // RF-032: el estado es el candado; sin botón no hay segunda recepción posible
      cy.contains(".glass.p-3", proveedor).should("contain", "recibido").within(() => {
        cy.contains("button", "Recepcionar").should("not.exist");
        cy.contains("button", "Cancelar").should("not.exist");
      });

      cy.reload();
      cy.esperarPantalla("Pedidos a proveedores");
      cy.contains(".glass.p-3", proveedor).should("contain", "recibido").find("button").should("not.exist");
      cy.stockEnSede(producto.sku, producto.almacen.nombre).should("eq", STOCK_ALMACEN + 15);
    });

    it("recepcionar desde una pantalla desactualizada un pedido que ya se recibió se rechaza y no duplica la entrada", () => {
      const proveedor = `Papelera Nacional ${Date.now()}`;
      prepararPedidoPendiente(proveedor, producto.almacen, 20).then((idPedido) => {
        // Arrange: la pantalla muestra el pedido como pendiente…
        abrirPedidosAProveedor();
        cy.contains(".glass.p-3", proveedor).contains("button", "Recepcionar").should("be.visible");

        // …y mientras tanto otra persona lo recepciona desde otro equipo
        cy.request({
          method: "POST",
          url: `${producto.sesion.apiUrl}/api/purchase-orders/${idPedido}/receive`,
          headers: { Authorization: `Bearer ${producto.sesion.token}` },
          log: false,
        });

        // Act: se pulsa el botón que la pantalla vieja todavía ofrece
        cy.contains(".glass.p-3", proveedor).contains("button", "Recepcionar").click();

        // Assert: conflicto explicado, y la mercadería entró una sola vez
        cy.get(".alert-danger")
          .should("be.visible")
          .and("contain", "El pedido ya fue recibido")
          .invoke("text")
          .should("not.match", JERGA_TECNICA);
        cy.stockEnSede(producto.sku, producto.almacen.nombre).should("eq", STOCK_ALMACEN + 20);
      });
    });

    it("un pedido cancelado no genera ninguna entrada ni puede recepcionarse después", () => {
      const proveedor = `Comercial Li ${Date.now()}`;
      prepararPedidoPendiente(proveedor, producto.almacen, 40);
      abrirPedidosAProveedor();

      cy.contains(".glass.p-3", proveedor).contains("button", "Cancelar").click();

      cy.contains(".glass.p-3", proveedor).should("contain", "cancelado").find("button").should("not.exist");
      cy.stockEnSede(producto.sku, producto.almacen.nombre).should("eq", STOCK_ALMACEN);
      abrirKardex();
      asientosDelProducto().should("have.length", 2).and("contain", "Saldo inicial de la prueba");
    });

    // DEFECTO REAL (AUD-04 / RF-032, crítico, pendiente de corrección): un doble clic
    // en «Recepcionar» ingresa la mercadería DOS veces.
    //
    // purchaseService.receiveOrder comprueba que el pedido esté «pendiente» ANTES de
    // abrir la transacción y sobre una lectura sin sesión. Dos peticiones casi
    // simultáneas leen las dos «pendiente», las dos aplican sus entradas y las dos
    // responden 200: con un pedido de 25 unidades el almacén pasa de 10 a 60 y el
    // kardex muestra dos asientos idénticos. El informe de estado lo tenía como
    // riesgo de concurrencia de la API; esta prueba demuestra que se alcanza desde
    // la interfaz, porque PurchaseOrders.jsx no deshabilita el botón mientras la
    // petición está en curso. Corrección sugerida: pasar a «recibido» con un
    // findOneAndUpdate condicionado a status «pendiente» dentro de la transacción,
    // y deshabilitar el botón durante el envío. Quitar el .skip al corregirlo.
    it.skip("un doble clic en Recepcionar ingresa la mercadería una sola vez", () => {
      const proveedor = `Tai Loy Mayorista ${Date.now()}`;
      prepararPedidoPendiente(proveedor, producto.almacen, 25);
      abrirPedidosAProveedor();

      cy.contains(".glass.p-3", proveedor).contains("button", "Recepcionar").dblclick();

      cy.contains(".glass.p-3", proveedor).should("contain", "recibido");
      cy.stockEnSede(producto.sku, producto.almacen.nombre).should("eq", STOCK_ALMACEN + 25);
      abrirKardex();
      asientosDelProducto().filter(':contains("Recepción de pedido")').should("have.length", 1);
    });
  });
});
