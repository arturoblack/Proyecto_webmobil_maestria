/**
 * Catálogo de productos: validaciones del formulario, alta, edición y baja.
 *
 * Cubre RF-04 de la memoria técnica (mantenimiento del catálogo; el stock no se
 * edita aquí), RNF-003 (los errores llegan como { message } legible y no como un
 * código HTTP), RNF-007 (el SKU es único) y el criterio UX-003 de la checklist de
 * auditoría: los errores se explican en el idioma del usuario.
 *
 * Las 23 pruebas de validation.api.test.js ya demuestran que el servidor rechaza
 * los datos inválidos. Lo que se añade aquí es que la persona que llena el
 * formulario se entere de por qué, que el formulario no se cierre dejándola sin
 * saber si guardó, y que el catálogo que ve después refleje lo ocurrido.
 *
 * Cada caso crea sus propios productos con un SKU irrepetible (sufijo temporal),
 * de modo que la spec se puede repetir sin reiniciar la base de datos.
 */
describe("Catálogo de productos — validaciones, alta, edición y baja", () => {
  // Un error comprensible no enseña códigos HTTP ni jerga del motor de base de datos
  const JERGA_TECNICA = /\b(400|404|409|500|Request failed|undefined|E11000|duplicate|Cast to|Path)\b/;

  const sufijoUnico = () => `${Date.now()}${Cypress._.random(10, 99)}`;

  // Se abre dentro de cada caso, después de preparar sus datos: así la tabla ya los trae
  const abrirCatalogo = () => {
    cy.visit("/productos");
    cy.esperarPantalla("Productos");
  };

  const abrirFormularioNuevo = () => {
    abrirCatalogo();
    cy.contains("button", "Nuevo producto").click();
    cy.contains(".modal-title", "Nuevo producto").should("be.visible");
  };

  const errorDelFormulario = () => cy.get(".modal .alert-danger").should("be.visible");

  // Vuelve a pedir el catálogo al servidor y espera a que la tabla esté pintada. Tras
  // un rechazo la pantalla no refresca la lista: afirmar que una fila «no existe»
  // sobre esa tabla vieja, o mientras aún carga, pasaría aunque el producto se
  // hubiera guardado. El seed garantiza que el catálogo nunca llega vacío.
  const recargarCatalogo = () => {
    cy.reload();
    cy.esperarPantalla("Productos");
    cy.get("tbody tr").should("have.length.greaterThan", 0);
  };

  beforeEach(() => {
    cy.iniciarSesion();
    cy.esperarPantalla("Panel");
  });

  context("validaciones del formulario", () => {
    it("un producto sin nombre o sin SKU no se guarda y el formulario dice qué falta", () => {
      const nombre = `Tajador metálico doble ${sufijoUnico()}`;
      abrirFormularioNuevo();

      // Act 1: todo en blanco
      cy.contains("button", "Guardar").click();

      errorDelFormulario().should("contain", "El nombre del producto es obligatorio");

      // Act 2: con nombre, pero sin SKU
      cy.campo("Nombre").type(nombre);
      cy.contains("button", "Guardar").click();

      errorDelFormulario().should("contain", "El SKU es obligatorio");
      // El formulario sigue abierto con lo escrito: cerrarlo haría creer que se guardó
      cy.contains(".modal-title", "Nuevo producto").should("be.visible");
      cy.campo("Nombre").should("have.value", nombre);

      // Y el servidor no guardó nada a medias
      recargarCatalogo();
      cy.contains("td", nombre).should("not.exist");
    });

    it("un precio negativo se rechaza con un mensaje comprensible y no llega al catálogo", () => {
      const sku = `NEG-${sufijoUnico()}`;
      abrirFormularioNuevo();

      cy.campo("Nombre").type("Regla de 30 cm");
      cy.campo("SKU").type(sku);
      cy.campo("Precio").type("-3.50");
      cy.contains("button", "Guardar").click();

      errorDelFormulario()
        .should("contain", "El precio no puede ser negativo")
        .invoke("text")
        .should("not.match", JERGA_TECNICA);

      recargarCatalogo();
      cy.contains("td", sku).should("not.exist");
    });

    // DEFECTO REAL (pendiente de corrección): un precio en blanco se guarda como S/ 0.00.
    //
    // Products.jsx arma el envío con `price: Number(form.price)`, y Number("") es 0.
    // El servidor sí exige el precio («El precio es obligatorio» cuando llega null),
    // pero nunca ve el campo vacío: recibe un 0 válido y crea el producto. Quien
    // olvida el precio publica sin aviso un artículo gratis en el punto de venta.
    // Coincide con el punto «precio cero» que el informe de estado deja sin decidir.
    // Corrección sugerida: enviar null cuando el campo está vacío, o validar la
    // forma en el cliente antes de llamar a la API. Quitar el .skip al corregirlo.
    it.skip("un precio en blanco se rechaza en vez de guardarse como S/ 0.00", () => {
      const sku = `SINPRECIO-${sufijoUnico()}`;
      abrirFormularioNuevo();

      cy.campo("Nombre").type("Goma en barra 21 g");
      cy.campo("SKU").type(sku);
      cy.contains("button", "Guardar").click();

      errorDelFormulario().should("contain", "El precio es obligatorio");
      recargarCatalogo();
      cy.contains("td", sku).should("not.exist");
    });

    it("un SKU ya registrado se rechaza aunque se escriba en minúsculas, con un mensaje comprensible", () => {
      // Arrange: un producto existente, creado para esta prueba
      cy.prepararProducto({ nombre: "Corrector líquido" }).then((existente) => {
        const nombreDuplicado = `Corrector en cinta ${sufijoUnico()}`;
        abrirFormularioNuevo();

        // Act: otro producto con el mismo SKU, esta vez en minúsculas
        cy.campo("Nombre").type(nombreDuplicado);
        cy.campo("SKU").type(existente.sku.toLowerCase());
        cy.campo("Precio").type("4.20");
        cy.contains("button", "Guardar").click();

        // Assert: se explica el conflicto sin enseñar el error E11000 de MongoDB
        errorDelFormulario()
          .should("contain", "ya está registrado")
          .invoke("text")
          .should("not.match", JERGA_TECNICA);

        // Assert: en el catálogo que devuelve el servidor el SKU sigue una sola vez
        recargarCatalogo();
        cy.contains("td", nombreDuplicado).should("not.exist");
        cy.get("td").filter(`:contains("SKU ${existente.sku}")`).should("have.length", 1).and("contain", existente.nombre);
      });
    });
  });

  context("alta y edición", () => {
    it("un alta válida aparece en el catálogo con su SKU normalizado, su categoría y su precio en soles", () => {
      const sufijo = sufijoUnico();
      const nombre = `Cartulina escolar ${sufijo}`;

      abrirFormularioNuevo();
      cy.campo("Nombre").type(nombre);
      cy.campo("SKU").type(`car-${sufijo}`);
      cy.campo("Precio").type("12.50");
      cy.campo("Categoría").select("Papelería");
      cy.campo("Descripción").type("Pliego de 50 × 65 cm");
      cy.contains("button", "Guardar").click();

      // Assert: el formulario se cierra y la fila nueva está en la tabla
      cy.get(".modal").should("not.exist");
      cy.contains("tr", nombre).within(() => {
        // El servidor guarda el SKU en mayúsculas: así no hay dos «iguales» a la vista
        cy.contains(`SKU CAR-${sufijo}`).should("be.visible");
        cy.contains("td", "Papelería").should("be.visible");
        cy.get("td").eq(2).importe().should("eq", 12.5);
      });

      // Assert: el buscador del catálogo lo encuentra por su SKU
      cy.get('input[placeholder^="Buscar"]').type(`CAR-${sufijo}`);
      cy.get("tbody tr").should("have.length", 1).and("contain", nombre);
    });

    it("editar cambia el nombre y el precio, pero el SKU queda bloqueado", () => {
      cy.prepararProducto({ nombre: "Micas A4", precio: 9.9 }).then((producto) => {
        const nombreNuevo = `${producto.nombre} (paquete x10)`;
        abrirCatalogo();

        cy.contains("tr", producto.sku).contains("button", "Editar").click();
        cy.contains(".modal-title", "Editar producto").should("be.visible");

        // El SKU identifica al producto en el kardex: cambiarlo rompería el historial
        cy.campo("SKU").should("be.disabled").and("have.value", producto.sku);

        cy.campo("Nombre").clear().type(nombreNuevo);
        cy.campo("Precio").clear().type("11.40");
        cy.contains("button", "Guardar").click();

        cy.get(".modal").should("not.exist");
        cy.contains("tr", producto.sku).within(() => {
          cy.contains(nombreNuevo).should("be.visible");
          cy.get("td").eq(2).importe().should("eq", 11.4);
        });
      });
    });
  });

  context("baja", () => {
    it("la baja pide confirmación y, si se cancela, el producto sigue en el catálogo", () => {
      cy.prepararProducto({ nombre: "Chinches dorados" }).then((producto) => {
        abrirCatalogo();
        cy.on("window:confirm", cy.stub().as("confirmacion").returns(false));

        cy.contains("tr", producto.sku).contains("button", "Eliminar").click();

        // La pregunta nombra el producto: evita borrar la fila equivocada
        cy.get("@confirmacion").should("have.been.calledOnce").and("have.been.calledWithMatch", producto.nombre);
        cy.contains("tr", producto.sku).should("be.visible");

        // Tampoco desaparece al volver a consultar al servidor
        cy.reload();
        cy.esperarPantalla("Productos");
        cy.contains("tr", producto.sku).should("be.visible");
      });
    });

    it("la baja confirmada retira del catálogo un producto sin existencias", () => {
      cy.prepararProducto({ nombre: "Clips mariposa" }).then((producto) => {
        abrirCatalogo();
        cy.on("window:confirm", cy.stub().as("confirmacion").returns(true));

        cy.contains("tr", producto.sku).contains("button", "Eliminar").click();

        cy.get("@confirmacion").should("have.been.calledOnce");
        // La fila se va sin recargar. Se exige una tabla ya pintada y sin el SKU en una
        // sola aserción: mientras la lista se refresca la tabla entera desaparece un
        // instante, y un «not.exist» suelto pasaría ahí aunque la fila volviera después
        cy.get("tbody").should(($tabla) => {
          expect($tabla.find("tr"), "filas del catálogo ya refrescado").to.have.length.greaterThan(0);
          expect($tabla.text()).to.not.contain(producto.sku);
        });
        cy.get(".alert-danger").should("not.exist");

        // Y tampoco vuelve al consultar de nuevo al servidor
        recargarCatalogo();
        cy.contains("tr", producto.sku).should("not.exist");
      });
    });

    it("un producto con existencias no se puede eliminar y el mensaje indica qué hacer", () => {
      // Borrarlo dejaría unidades físicas en el almacén sin ficha en el sistema
      cy.prepararProducto({ nombre: "Perforador de dos huecos", stockAlmacen: 6 }).then((producto) => {
        abrirCatalogo();
        cy.on("window:confirm", () => true);

        cy.contains("tr", producto.sku).contains("button", "Eliminar").click();

        cy.get(".alert-danger")
          .should("be.visible")
          .and("contain", "No se puede eliminar un producto con existencias")
          .and("contain", "registra su salida primero");
        cy.contains("tr", producto.sku).should("be.visible");
      });
    });
  });

  // DEFECTO REAL (RNF-009, pendiente de corrección): el texto del buscador se pasa
  // tal cual a $regex en productController.listProducts, sin escapar.
  //
  // Un paréntesis sin cerrar es una expresión regular inválida: MongoDB la rechaza,
  // la API responde 500 y la pantalla muestra «Error interno del servidor». No es un
  // caso rebuscado: el seed trae «Papel bond A4 75 g (millar)», y quien escriba
  // «(millar» para encontrarlo se queda sin catálogo. Además «.» o «.*» actúan como
  // comodines, así que la búsqueda devuelve filas que no contienen lo escrito.
  // Corrección sugerida: escapar los metacaracteres antes de construir el filtro.
  // Quitar el .skip al corregirlo.
  it.skip("buscar un texto con paréntesis encuentra el producto en vez de mostrar un error", () => {
    abrirCatalogo();

    cy.get('input[placeholder^="Buscar"]').type("(millar");

    cy.get(".alert-danger").should("not.exist");
    cy.get("tbody tr").should("have.length", 1).and("contain", "Papel bond A4 75 g (millar)");
  });
});
