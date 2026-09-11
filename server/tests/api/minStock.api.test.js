const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../../app");
const { connect, clear, disconnect } = require("../helpers/db");
const { seedUsers, loginAs } = require("../helpers/auth");

/**
 * Ciclo TDD — mejora seleccionada del backlog v2.0 (Actividad 13).
 *
 * Necesidad: PUT /api/stocks/:id/min-stock es la única ruta del sistema que no
 * devuelve 404 ante un identificador inexistente; responde 200 con cuerpo null y
 * rompe el contrato uniforme que cumple el resto de la API. Un cliente que reciba
 * ese 200 creerá que el ajuste se aplicó.
 *
 * Criterio de aceptación: ajustar el umbral mínimo de un registro de existencias
 * que no existe debe responder 404 con el contrato { message }.
 *
 * Etapa RED: esta prueba debe fallar antes de tocar el código productivo.
 */

let token;

beforeAll(connect);
afterAll(disconnect);
beforeEach(async () => {
  await clear();
  await seedUsers();
  token = await loginAs(request, app, "admin");
});

describe("PUT /api/stocks/:id/min-stock — registro inexistente", () => {
  test("responde 404 con el contrato uniforme, no 200 con cuerpo vacío", async () => {
    // Arrange: un identificador con forma válida que no corresponde a ninguna fila
    const inexistente = new mongoose.Types.ObjectId().toString();

    // Act
    const response = await request(app)
      .put(`/api/stocks/${inexistente}/min-stock`)
      .set("Authorization", token)
      .send({ minStock: 12 });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body.message).toEqual(expect.any(String));
  });
});
