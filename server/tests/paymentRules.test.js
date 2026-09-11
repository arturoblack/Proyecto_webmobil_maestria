/**
 * Pruebas unitarias del pago simulado del punto de venta (sin base de datos).
 *
 * Complementan a inventoryService.test.js, que ya cubre el método desconocido,
 * el pago insuficiente, el vuelto con redondeo y la billetera digital. Aquí se
 * añaden las fronteras y la aritmética de céntimos, que es donde un sistema de
 * caja falla de forma más silenciosa.
 */
const { computePayment } = require("../services/salesService");

describe("computePayment — fronteras del pago en efectivo", () => {
  test("acepta el importe exacto y devuelve vuelto cero", () => {
    // Arrange: el cliente paga justo
    const total = 34.5;

    // Act
    const pago = computePayment("efectivo", total, 34.5);

    // Assert
    expect(pago).toEqual({ method: "efectivo", paidWith: 34.5, change: 0 });
  });

  test("rechaza un céntimo por debajo del total", () => {
    // Arrange y Act y Assert: la frontera inferior debe caer del lado del rechazo
    expect(() => computePayment("efectivo", 34.5, 34.49)).toThrow(/menor al total/);
  });

  test("acepta el importe como cadena numérica, porque llega desde un formulario", () => {
    // Arrange: el cliente envía lo que escribió el vendedor en el input
    const pago = computePayment("efectivo", 10, "20");

    // Assert: Number() lo convierte y el vuelto se calcula igual
    expect(pago.paidWith).toBe(20);
    expect(pago.change).toBe(10);
  });

  test("rechaza un importe no numérico", () => {
    expect(() => computePayment("efectivo", 10, "veinte")).toThrow(/monto pagado/);
    expect(() => computePayment("efectivo", 10, undefined)).toThrow(/monto pagado/);
    expect(() => computePayment("efectivo", 10, null)).toThrow(/monto pagado/);
  });
});

describe("computePayment — aritmética de céntimos", () => {
  test("el vuelto se redondea a dos decimales pese a la coma flotante", () => {
    // Arrange: 3 unidades a S/ 0.10 dan 0.30000000000000004 en coma flotante
    const total = 0.1 + 0.1 + 0.1;

    // Act
    const pago = computePayment("efectivo", total, 1);

    // Assert: el vuelto entregado al cliente debe ser una cifra de caja, no un binario
    expect(pago.change).toBe(0.7);
  });

  test("un vuelto con muchos decimales queda en dos", () => {
    // Arrange: importe que no cae en la frontera del medio céntimo
    const pago = computePayment("efectivo", 12.34, 20);

    // Assert
    expect(pago.change).toBe(7.66);
    expect(pago.change.toFixed(2)).toBe("7.66");
  });

  // Nota para el informe: el medio céntimo exacto (por ejemplo un vuelto de 7.655)
  // se redondea HACIA ABAJO y no hacia arriba, porque 7.655 * 100 vale
  // 765.4999999999999 en coma flotante. Queda documentado como defecto y se
  // corrige en el ciclo TDD de las actividades 14 a 16.

  test("no produce vuelto negativo en ningún caso admitido", () => {
    // Arrange: recorrido de importes válidos
    const casos = [
      [10, 10],
      [10, 10.01],
      [0.5, 1],
      [99.99, 100],
    ];

    // Act y Assert
    casos.forEach(([total, entregado]) => {
      expect(computePayment("efectivo", total, entregado).change).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("computePayment — la billetera digital no admite influencia del cliente", () => {
  test("ignora el importe que envíe el cliente y cobra el total exacto", () => {
    // Arrange: el cliente intenta declarar que pagó un sol por una compra de 120
    const total = 120;

    // Act
    const pago = computePayment("billetera", total, 1);

    // Assert: el servidor impone el total y no deja vuelto
    expect(pago.paidWith).toBe(120);
    expect(pago.change).toBe(0);
  });

  test("no exige importe entregado", () => {
    expect(() => computePayment("billetera", 55.4)).not.toThrow();
  });
});

describe("computePayment — métodos admitidos", () => {
  test("solo admite efectivo y billetera", () => {
    // Arrange: métodos que el negocio no contempla
    ["tarjeta", "yape", "transferencia", "", null, undefined].forEach((metodo) => {
      // Act y Assert
      expect(() => computePayment(metodo, 10, 10)).toThrow(/método de pago/);
    });
  });

  test("el rechazo del método es un 400, no un error interno", () => {
    try {
      computePayment("tarjeta", 10, 10);
      throw new Error("debió lanzar");
    } catch (error) {
      expect(error.status).toBe(400);
    }
  });
});
