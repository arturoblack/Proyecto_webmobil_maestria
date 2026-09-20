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

// Inicia sesión como la vendedora (rol «vendedor») por la interfaz real.
// Sus credenciales tampoco se versionan: claves usuarioVendedor y claveVendedor
// de cypress.env.json, o variables CYPRESS_usuarioVendedor / CYPRESS_claveVendedor.
Cypress.Commands.add("iniciarSesionVendedora", () => {
  cy.env(["usuarioVendedor", "claveVendedor"]).then(({ usuarioVendedor, claveVendedor }) => {
    // Sin este aviso, iniciarSesion caería en las credenciales del administrador y
    // las pruebas de control de acceso fallarían con un mensaje engañoso. Se lanza
    // un Error y no un expect() para que la clave no quede escrita en el registro.
    if (!usuarioVendedor || !claveVendedor) {
      throw new Error("Faltan usuarioVendedor y claveVendedor en cypress.env.json (o CYPRESS_usuarioVendedor y CYPRESS_claveVendedor)");
    }

    cy.iniciarSesion(usuarioVendedor, claveVendedor);
  });
});

// Localiza un control de formulario por el texto de su etiqueta, como lo hace una
// persona o un lector de pantalla: sobrevive a cambios de id y de maquetación.
Cypress.Commands.add("campo", (etiqueta) => {
  cy.contains("label", etiqueta)
    .invoke("attr", "for")
    .then((id) => cy.get(`#${id}`));
});

// Prepara (Arrange) un producto propio de la prueba llamando a la API, con
// existencias iniciales opcionales en el almacén y en la tienda.
//
// Cada caso nace así con su producto y sus saldos: las specs se pueden repetir y
// ejecutar en cualquier orden sin depender de lo que otra spec haya vendido. Solo
// la preparación usa la API; lo que se prueba (Act y Assert) va siempre por la
// interfaz. Las existencias iniciales entran como movimientos de entrada, porque
// el kardex es la única vía legítima de mutar el stock.
Cypress.Commands.add("prepararProducto", ({ nombre = "Archivador lomo ancho", precio = 7.5, stockAlmacen = 0, stockTienda = 0 } = {}) => {
  // El sufijo hace único el SKU; va en mayúsculas porque el servidor lo normaliza así
  const sufijo = `${Date.now()}${Cypress._.random(10, 99)}`;
  const producto = { nombre: `${nombre} ${sufijo}`, sku: `E2E-${sufijo}`, precio };

  return cy.env(["apiUrl", "usuario", "clave"]).then(({ apiUrl, usuario, clave }) => {
    const pedir = (method, ruta, body, token) =>
      cy.request({ method, url: `${apiUrl}${ruta}`, body, headers: token ? { Authorization: `Bearer ${token}` } : {}, log: false });

    return pedir("POST", "/api/auth/login", { username: usuario, password: clave }).then(({ body: sesion }) => {
      const { token } = sesion;
      // Con esto una prueba puede seguir preparando datos, o actuar «desde otra
      // pestaña», y sabe qué nombre debe figurar como responsable en el kardex
      producto.sesion = { token, apiUrl, nombreUsuario: sesion.user.name };

      pedir("GET", "/api/locations", undefined, token).then(({ body: sedes }) => {
        const almacen = sedes.find((s) => s.type === "almacen");
        const tienda = sedes.find((s) => s.type === "tienda");
        producto.almacen = { id: almacen._id, nombre: almacen.name };
        producto.tienda = { id: tienda._id, nombre: tienda.name };
      });

      pedir("POST", "/api/products", { name: producto.nombre, sku: producto.sku, category: "Oficina", price: precio }, token).then(({ body }) => {
        producto.id = body._id;
        const entrada = (destinationId, quantity) =>
          pedir("POST", "/api/movements", { type: "entrada", productId: body._id, destinationId, quantity, reason: "Saldo inicial de la prueba" }, token);
        if (stockAlmacen > 0) entrada(producto.almacen.id, stockAlmacen);
        if (stockTienda > 0) entrada(producto.tienda.id, stockTienda);
      });

      return cy.wrap(producto, { log: false });
    });
  });
});

// Lee en la pantalla de Inventario las unidades de un producto en una sede.
// Se consulta la misma pantalla que mira el dueño para cuadrar el inventario:
// si el saldo cambió en la base de datos pero no aquí, para el usuario no cambió.
Cypress.Commands.add("stockEnSede", (sku, sede) => {
  cy.visit("/inventario");
  cy.esperarPantalla("Inventario");
  cy.get('input[placeholder^="Buscar"]').type(sku);

  // La insignia muestra «Sede · 12», o «Sede · 3 ⚠» cuando está bajo el mínimo
  return cy
    .contains(".glass", `SKU ${sku}`, { timeout: 15000 })
    .contains(".badge", sede)
    .invoke("text")
    .then((texto) => Number(texto.match(/·\s*(\d+)/)[1]));
});
