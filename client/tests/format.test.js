import { describe, expect, test } from "vitest";
import { MOVEMENT_LABELS, ORDER_STATUS_LABELS, dateTime, money } from "../src/utils/format";

/**
 * Reglas puras de presentación del cliente (equivalente del perfil unitario del
 * back-end). No tocan la API ni el DOM.
 *
 * El formato de moneda tiene reglas de negocio: los importes de LibreStock son
 * soles peruanos y deben mostrarse como tales en toda la aplicación.
 */

// Intl separa el símbolo con un espacio duro; normalizarlo evita una prueba frágil
const normalizar = (texto) => texto.replace(/ /g, " ");

describe("money — formato de importes en soles", () => {
  test("usa el símbolo de sol peruano", () => {
    expect(normalizar(money(10))).toContain("S/");
  });

  test("muestra siempre dos decimales", () => {
    expect(normalizar(money(4.5))).toBe("S/ 4.50");
    expect(normalizar(money(4))).toBe("S/ 4.00");
  });

  test("separa los miles", () => {
    expect(normalizar(money(1234.5))).toBe("S/ 1,234.50");
  });

  test("un importe nulo o ausente se muestra como cero y no como «NaN»", () => {
    // El dashboard pinta indicadores que aún no han cargado: nunca debe verse NaN
    expect(normalizar(money(null))).toBe("S/ 0.00");
    expect(normalizar(money(undefined))).toBe("S/ 0.00");
  });

  test("el cero se muestra explícitamente, no como cadena vacía", () => {
    expect(normalizar(money(0))).toBe("S/ 0.00");
  });

  test("redondea a dos decimales los importes con más precisión", () => {
    expect(normalizar(money(0.456))).toBe("S/ 0.46");
  });
});

describe("dateTime — fechas del kardex", () => {
  // No se comprueba el texto exacto: depende de la zona horaria de la máquina y
  // haría fallar la prueba en el equipo de otro integrante. Se comprueban las
  // partes que el usuario necesita ver: el día y la hora.
  test("incluye el día y la hora del movimiento", () => {
    const iso = "2026-09-11T15:30:00Z";

    const texto = dateTime(iso);

    expect(texto).toContain(String(new Date(iso).getDate()));
    expect(texto).toMatch(/\d{1,2}:\d{2}/);
  });

  test("dos instantes distintos producen textos distintos", () => {
    expect(dateTime("2026-09-11T08:00:00Z")).not.toBe(dateTime("2026-09-11T20:00:00Z"));
  });

  test("una fecha ausente o inválida no rompe la pantalla", () => {
    // Comportamiento actual documentado: no lanza, pero muestra «Invalid Date».
    // Es un detalle de presentación pendiente, no un fallo que tumbe el kardex.
    expect(() => dateTime(undefined)).not.toThrow();
    expect(() => dateTime("no-es-una-fecha")).not.toThrow();
  });
});

describe("MOVEMENT_LABELS — etiquetas del kardex", () => {
  // El servidor solo emite estos cuatro tipos de movimiento: si el cliente no
  // cubre alguno, esa fila del kardex se pintaría sin etiqueta
  const TIPOS_DEL_SERVIDOR = ["entrada", "salida", "transferencia", "venta"];

  test.each(TIPOS_DEL_SERVIDOR)("cubre el tipo de movimiento «%s»", (tipo) => {
    expect(MOVEMENT_LABELS[tipo]).toBeDefined();
    expect(MOVEMENT_LABELS[tipo].label).toBeTruthy();
    expect(MOVEMENT_LABELS[tipo].className).toBeTruthy();
  });

  test("no declara tipos que el servidor no emite", () => {
    expect(Object.keys(MOVEMENT_LABELS).sort()).toEqual([...TIPOS_DEL_SERVIDOR].sort());
  });

  test("las salidas de inventario y las ventas se distinguen en el texto", () => {
    // Ambas descuentan existencias y comparten color; el texto es lo que las separa
    expect(MOVEMENT_LABELS.salida.label).not.toBe(MOVEMENT_LABELS.venta.label);
  });
});

describe("ORDER_STATUS_LABELS — estados de los pedidos", () => {
  const ESTADOS_DEL_SERVIDOR = ["pendiente", "entregado", "recibido", "cancelado"];

  test.each(ESTADOS_DEL_SERVIDOR)("cubre el estado «%s»", (estado) => {
    expect(ORDER_STATUS_LABELS[estado]).toBeTruthy();
  });

  test("un pedido cancelado no se muestra con el mismo estilo que uno pendiente", () => {
    expect(ORDER_STATUS_LABELS.cancelado).not.toBe(ORDER_STATUS_LABELS.pendiente);
  });
});
