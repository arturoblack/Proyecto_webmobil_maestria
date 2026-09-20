/**
 * Control de acceso por rol visto desde el navegador: qué ve la vendedora, adónde
 * puede llegar escribiendo una URL y qué queda accesible al cerrar la sesión.
 *
 * Cubre RF-003 (autorización por rol, marcado como crítico) y RF-02 de la memoria
 * técnica (roles administrador y vendedor); en el cierre de sesión, RF-001 y
 * RF-002 (la sesión JWT vive en el navegador y tiene que poder salir de él), junto
 * con el criterio UX-002: nadie se queda en una pantalla que no le corresponde ni
 * delante de una página en blanco.
 *
 * La spec 01 ya cubre al usuario SIN sesión. Esta cubre al usuario con sesión pero
 * sin permiso, que es otro guardián (RequireAdmin) y otro riesgo. La barrera de
 * verdad es el servidor (42 pruebas en authorization.api.test.js): aquí se
 * verifica que la interfaz sea coherente con ella y no ofrezca lo que luego la
 * API va a negar.
 *
 * Las credenciales de la vendedora se leen de usuarioVendedor y claveVendedor
 * (cypress.env.json o variables CYPRESS_*), igual que las del administrador.
 */
describe("Control de acceso por rol", () => {
  // «recurso» es lo que cada pantalla le pide a la API nada más montarse
  const PANTALLAS_DE_ADMINISTRACION = [
    { ruta: "/usuarios", titulo: "Usuarios", enlace: "Usuarios", recurso: "/api/users" },
    { ruta: "/productos", titulo: "Productos", enlace: "Productos", recurso: "/api/products" },
    { ruta: "/ubicaciones", titulo: "Ubicaciones", enlace: "Ubicaciones", recurso: "/api/locations" },
    { ruta: "/pedidos-proveedor", titulo: "Pedidos a proveedores", enlace: "Pedidos proveedor", recurso: "/api/purchase-orders" },
  ];

  context("con la sesión de la vendedora", () => {
    beforeEach(() => {
      cy.iniciarSesionVendedora();
      cy.esperarPantalla("Panel");
    });

    it("el menú le ofrece el trabajo diario y ninguna opción de administración", () => {
      cy.get("nav.side-nav").within(() => {
        cy.contains("Vendedor").should("be.visible");
        ["Stock", "Vender", "Movs.", "Pedidos"].forEach((enlace) => {
          cy.contains("a", enlace).should("be.visible");
        });

        cy.contains("ADMINISTRACIÓN").should("not.exist");
        PANTALLAS_DE_ADMINISTRACION.forEach(({ ruta }) => {
          cy.get(`a[href="${ruta}"]`).should("not.exist");
        });
      });
    });

    PANTALLAS_DE_ADMINISTRACION.forEach(({ ruta, titulo, recurso }) => {
      it(`al entrar por URL directa a ${ruta} es devuelta al panel sin ver la pantalla`, () => {
        // Se vigila la API: si la pantalla llegara a montarse, aunque fuera un
        // instante antes de la redirección, pediría sus datos al servidor
        cy.intercept("GET", `**${recurso}*`).as("datosDeLaPantalla");

        cy.visit(ruta);

        cy.location("pathname").should("eq", "/");
        cy.esperarPantalla("Panel");
        cy.contains("h1", titulo).should("not.exist");
        cy.get("@datosDeLaPantalla.all").should("have.length", 0);
      });
    });

    it("en Movimientos consulta el kardex, pero no dispone del botón para registrar", () => {
      // Pantalla compartida por los dos roles: lo que cambia es la acción disponible
      cy.visit("/movimientos");
      cy.esperarPantalla("Movimientos");

      cy.contains("button", "Todos").should("be.visible");
      cy.contains("button", "Registrar").should("not.exist");
    });
  });

  context("con la sesión del administrador", () => {
    beforeEach(() => {
      cy.iniciarSesion();
      cy.esperarPantalla("Panel");
    });

    it("llega por el menú a las cuatro pantallas de administración y sigue en ellas al recargar", () => {
      cy.get("nav.side-nav").contains("ADMINISTRACIÓN").should("be.visible");

      PANTALLAS_DE_ADMINISTRACION.forEach(({ ruta, titulo, enlace }) => {
        cy.get("nav.side-nav").contains("a", enlace).click();

        cy.location("pathname").should("eq", ruta);
        cy.esperarPantalla(titulo);
        // La API tampoco le niega los datos: la pantalla carga sin error
        cy.get(".alert-danger").should("not.exist");

        // El guardián no debe pecar de estricto: recargar equivale a entrar por URL
        // directa, y el rol tiene que rehidratarse antes de decidir la redirección
        cy.reload();
        cy.location("pathname").should("eq", ruta);
        cy.esperarPantalla(titulo);
      });
    });

    it("cerrar sesión borra las credenciales e impide volver a una ruta protegida", () => {
      cy.visit("/productos");
      cy.esperarPantalla("Productos");

      cy.get('button[title="Cerrar sesión"]').click();

      // Assert: vuelve al inicio de sesión y el navegador ya no guarda el token
      cy.location("pathname").should("eq", "/login");
      cy.window().then((ventana) => {
        expect(ventana.localStorage.getItem("token"), "token en localStorage").to.be.null;
        expect(ventana.localStorage.getItem("user"), "usuario en localStorage").to.be.null;
      });

      // Assert: ni el botón Atrás ni la URL directa devuelven la pantalla protegida.
      // En una tienda el equipo es compartido: el siguiente no debe heredar la sesión.
      cy.go("back");
      cy.location("pathname").should("eq", "/login");
      cy.contains("h1", "Productos").should("not.exist");

      cy.visit("/productos");
      cy.location("pathname").should("eq", "/login");
      cy.contains("button", "Ingresar").should("be.visible");
    });
  });

  // DEFECTO REAL (pendiente de corrección): en un móvil no hay cómo cerrar sesión.
  //
  // El único botón «Cerrar sesión» vive en el menú lateral de AppLayout.jsx, que
  // lleva `d-none d-lg-block`: por debajo de 992 px desaparece, y la barra inferior
  // que lo sustituye solo pinta los cinco enlaces diarios. La vendedora que usa el
  // teléfono de la tienda no puede salir de su cuenta, y el README del cliente
  // advierte precisamente que en una tienda el equipo es compartido. El token dura
  // 8 horas, así que quien tome el teléfono después hereda la sesión.
  // Corrección sugerida: añadir la acción de salir a la barra inferior o a una
  // cabecera visible en móvil. Quitar el .skip al corregirlo.
  it.skip("en la vista de móvil también existe una forma visible de cerrar sesión", () => {
    cy.viewport(390, 844);
    cy.iniciarSesionVendedora();
    cy.esperarPantalla("Panel");

    // Se acepta cualquier control visible que se anuncie como salida, sea por su
    // texto, su title o su aria-label: la prueba no impone el diseño de la solución
    cy.get("button:visible, a:visible")
      .filter((_, control) => /cerrar sesión|salir/i.test(`${control.innerText} ${control.title} ${control.getAttribute("aria-label") ?? ""}`))
      .should("have.length.greaterThan", 0);
  });
});
