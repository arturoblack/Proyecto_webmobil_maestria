/**
 * Pruebas unitarias de las reglas críticas del inventario (sin base de datos):
 * blindan las invariantes que sostienen la integridad del stock.
 */
const {
  validateMovementInput,
  validateSufficientStock,
} = require("../services/inventoryService");
const { computePayment } = require("../services/salesService");
const ApiError = require("../utils/ApiError");

describe("validateMovementInput — reglas de forma del movimiento", () => {
  const base = { quantity: 5, originId: "A", destinationId: "B" };

  test("rechaza un tipo de movimiento desconocido", () => {
    expect(() => validateMovementInput({ ...base, type: "ajuste" })).toThrow(ApiError);
  });

  test("rechaza cantidades no enteras", () => {
    expect(() => validateMovementInput({ type: "entrada", quantity: 2.5, destinationId: "B" })).toThrow(
      /entero/
    );
  });

  test("rechaza cantidad cero o negativa", () => {
    expect(() => validateMovementInput({ type: "entrada", quantity: 0, destinationId: "B" })).toThrow();
    expect(() => validateMovementInput({ type: "entrada", quantity: -3, destinationId: "B" })).toThrow();
  });

  test("una salida exige ubicación de origen", () => {
    expect(() => validateMovementInput({ type: "salida", quantity: 1 })).toThrow(/origen/);
  });

  test("una entrada exige ubicación de destino", () => {
    expect(() => validateMovementInput({ type: "entrada", quantity: 1 })).toThrow(/destino/);
  });

  test("una transferencia exige origen y destino distintos", () => {
    expect(() =>
      validateMovementInput({ type: "transferencia", quantity: 1, originId: "A", destinationId: "A" })
    ).toThrow(/distintos/);
  });

  test("acepta una transferencia bien formada", () => {
    expect(() =>
      validateMovementInput({ type: "transferencia", quantity: 10, originId: "A", destinationId: "B" })
    ).not.toThrow();
  });
});

describe("validateSufficientStock — el stock nunca queda negativo", () => {
  test("rechaza una salida mayor a las existencias", () => {
    expect(() => validateSufficientStock(3, 4, "Cuaderno Loro")).toThrow(/Stock insuficiente/);
  });

  test("acepta una salida exactamente igual a las existencias", () => {
    expect(() => validateSufficientStock(4, 4, "Cuaderno Loro")).not.toThrow();
  });
});

describe("computePayment — pago simulado del punto de venta", () => {
  test("rechaza un método de pago desconocido", () => {
    expect(() => computePayment("cheque", 10, 10)).toThrow(/método de pago/);
  });

  test("en efectivo, rechaza un pago menor al total", () => {
    expect(() => computePayment("efectivo", 34.5, 30)).toThrow(/menor al total/);
  });

  test("en efectivo, calcula el vuelto con redondeo a céntimos", () => {
    expect(computePayment("efectivo", 34.5, 50)).toEqual({
      method: "efectivo",
      paidWith: 50,
      change: 15.5,
    });
  });

  test("con billetera digital, el pago es exacto y sin vuelto", () => {
    expect(computePayment("billetera", 34.5)).toEqual({
      method: "billetera",
      paidWith: 34.5,
      change: 0,
    });
  });
});
