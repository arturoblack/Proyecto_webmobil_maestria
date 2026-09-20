const CENTS_PER_UNIT = 100;

// Decimales de céntimo que se conservan al descartar el ruido binario: el error de operar
// con importes de caja queda varios órdenes de magnitud por debajo de la millonésima
const CENT_NOISE_DECIMALS = 6;

/**
 * Convierte un importe a céntimos enteros; el medio céntimo exacto redondea hacia arriba.
 *
 * Los importes viajan como Number con decimales y la coma flotante deja algunos medios
 * céntimos una fracción por debajo: 20 - 12.345 da 7.654999999999999, que son
 * 765.4999999999999 céntimos, y Math.round a secas los bajaría a 765. Sumar
 * Number.EPSILON no lo arregla, porque a esa magnitud ni siquiera altera el valor; por
 * eso los céntimos se fijan antes a unos pocos decimales, que es donde vive el ruido.
 */
const toCents = (amount) =>
  Math.round(Number((amount * CENTS_PER_UNIT).toFixed(CENT_NOISE_DECIMALS)));

// Un entero entre cien da el Number más cercano al importe decimal: no arrastra ruido
const fromCents = (cents) => cents / CENTS_PER_UNIT;

module.exports = { toCents, fromCents };
