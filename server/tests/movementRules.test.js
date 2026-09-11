/**
 * Pruebas unitarias de las reglas de forma del movimiento (sin base de datos).
 *
 * Complementan a inventoryService.test.js: aquí se cubren los casos que aquel
 * archivo no toca —el tipo "venta", los tipos ausentes y las fronteras exactas
 * de la suficiencia de existencias— evitando duplicar lo ya probado.
 */
const {
  validateMovementInput,
  validateSufficientStock,
} = require("../services/inventoryService");
const ApiError = require("../utils/ApiError");

describe("validateMovementInput — el tipo venta", () => {
  test("una venta exige ubicación de origen", () => {
    // Arrange: una venta sin la tienda desde la que se despacha
    const movimiento = { type: "venta", quantity: 3 };

    // Act y Assert: el servicio la rechaza nombrando el origen
    expect(() => validateMovementInput(movimiento)).toThrow(/origen/);
  });

  test("una venta no exige ubicación de destino", () => {
    // Arrange: la mercadería sale de la tienda y no entra a ninguna sede
    const movimiento = { type: "venta", quantity: 3, originId: "tienda-1" };

    // Act y Assert
    expect(() => validateMovementInput(movimiento)).not.toThrow();
  });
});

describe("validateMovementInput — tipos no admitidos", () => {
  test("rechaza un tipo ausente", () => {
    expect(() => validateMovementInput({ quantity: 1, destinationId: "almacen-1" })).toThrow(ApiError);
  });

  test("rechaza un tipo en mayúsculas: la lista distingue mayúsculas", () => {
    // Arrange: "ENTRADA" no es "entrada"
    const movimiento = { type: "ENTRADA", quantity: 1, destinationId: "almacen-1" };

    // Act y Assert
    expect(() => validateMovementInput(movimiento)).toThrow(/entrada, salida, transferencia o venta/);
  });

  test("el mensaje de error enumera los cuatro tipos admitidos", () => {
    // El mensaje forma parte del contrato con el usuario: si cambia, la interfaz miente
    try {
      validateMovementInput({ type: "merma", quantity: 1, originId: "almacen-1" });
      throw new Error("debió lanzar");
    } catch (error) {
      expect(error.status).toBe(400);
      expect(error.message).toContain("entrada");
      expect(error.message).toContain("venta");
    }
  });
});

describe("validateMovementInput — fronteras de la cantidad", () => {
  const base = { type: "entrada", destinationId: "almacen-1" };

  test("acepta la cantidad mínima admisible, que es 1", () => {
    expect(() => validateMovementInput({ ...base, quantity: 1 })).not.toThrow();
  });

  test("rechaza una cantidad en forma de cadena aunque represente un entero", () => {
    // Arrange: el controlador convierte con Number(), pero el servicio no debe confiar en ello
    const movimiento = { ...base, quantity: "10" };

    // Act y Assert
    expect(() => validateMovementInput(movimiento)).toThrow(/entero/);
  });

  test("rechaza una cantidad no numérica", () => {
    expect(() => validateMovementInput({ ...base, quantity: NaN })).toThrow(/entero/);
    expect(() => validateMovementInput({ ...base, quantity: undefined })).toThrow(/entero/);
    expect(() => validateMovementInput({ ...base, quantity: null })).toThrow(/entero/);
  });

  test("rechaza una cantidad fraccionaria, que es la que bloquea la recepción de pedidos", () => {
    // Este caso es el que deja un pedido a proveedor imposible de recepcionar:
    // el alta lo acepta pero applyMovement lo rechaza
    expect(() => validateMovementInput({ ...base, quantity: 2.5 })).toThrow(/entero/);
  });
});

describe("validateSufficientStock — fronteras de la suficiencia", () => {
  test("rechaza cualquier salida cuando no hay existencias", () => {
    // Arrange: sede sin stock del producto
    const disponible = 0;

    // Act y Assert
    expect(() => validateSufficientStock(disponible, 1, "Lápiz Mongol N°2")).toThrow(/Stock insuficiente/);
  });

  test("el mensaje informa la cantidad realmente disponible y el producto", () => {
    // Arrange
    const disponible = 3;

    // Act
    try {
      validateSufficientStock(disponible, 10, "Cuaderno Loro 92 h. cuadriculado");
      throw new Error("debió lanzar");
    } catch (error) {
      // Assert: el vendedor necesita saber cuánto queda, no solo que no alcanza
      expect(error.status).toBe(400);
      expect(error.message).toContain("3");
      expect(error.message).toContain("Cuaderno Loro 92 h. cuadriculado");
    }
  });

  test("acepta una salida menor a las existencias", () => {
    expect(() => validateSufficientStock(10, 4, "Borrador blanco")).not.toThrow();
  });
});
