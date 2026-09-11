import "./commands";

/**
 * Archivo de soporte: se carga antes de cada archivo de pruebas.
 *
 * LibreStock no opera sin conexión y no captura excepciones del navegador, así
 * que cualquier error no controlado en la SPA debe hacer fallar la prueba en vez
 * de pasar desapercibido. Por eso NO se silencia uncaught:exception.
 */
