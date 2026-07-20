# LibreStock — API (back-end)

API REST de LibreStock: gestión de stock, almacén y ventas para librerías y papelerías con múltiples ubicaciones. Node.js + Express + MongoDB Atlas (Mongoose), autenticación JWT con roles.

## Puesta en marcha

```bash
cp .env.example .env      # completar MONGO_URI y JWT_SECRET
npm install
npm run seed              # datos de demostración (admin/admin123, rosa/rosa123)
npm run dev               # http://localhost:5001
```

## Estructura (estándares de la sección 5.1 de la memoria técnica)

```
routes/       endpoints y middlewares — sin lógica
middlewares/  auth (JWT + rol) y errorHandler centralizado
controllers/  orquestación HTTP, delgados (asyncHandler + servicios)
services/     lógica de negocio: inventoryService es el ÚNICO lugar que muta stock
models/       esquemas Mongoose (índice único producto+ubicación en Stock)
tests/        Jest: unitarias de reglas puras + integration/ contra MongoDB real
```

## Endpoints principales

| Método y ruta | RF | Rol |
|---|---|---|
| POST /api/auth/login | RF-01 | público |
| GET/POST/DELETE /api/users | RF-02 | admin |
| GET/POST/PUT/DELETE /api/locations | RF-03 | lectura: todos · escritura: admin |
| GET/POST/PUT/DELETE /api/products | RF-04 | lectura: todos · escritura: admin |
| GET /api/stocks · PUT /api/stocks/:id/min-stock | RF-05, RF-06 | todos · mínimo: admin |
| GET/POST /api/movements | RF-07–09 | lectura: todos · registro: admin |
| GET/POST /api/customer-orders · PUT /:id/status | RF-10 | todos |
| GET/POST /api/purchase-orders · POST /:id/receive · /:id/cancel | RF-11, RF-12 | admin |
| GET/POST /api/sales | RF-13 | todos |
| GET /api/stats | RF-14 | todos |

## Reglas de negocio garantizadas en el servidor

- El stock pertenece al par **producto–ubicación** y **solo** muta a través de movimientos (kardex = fuente de verdad).
- Una salida/venta jamás deja stock negativo; la transferencia descuenta y abona en **una transacción**.
- Las ventas solo se procesan en ubicaciones de tipo **tienda**, con precios tomados del catálogo en el servidor.
- La recepción de un pedido a proveedor genera las entradas automáticas y es irrepetible (estado).

## Pruebas

```bash
npm test                  # unitarias: reglas puras, no requieren base de datos
npm run test:integration  # integración: requieren MongoDB con replica set
```

Las **unitarias** cubren las invariantes puras: tipos y cantidades de movimiento, stock
suficiente y el cálculo del pago simulado.

Las de **integración** (`tests/integration/`) ejercitan el punto de venta contra un MongoDB
real: verifican que la transacción commitee, que el stock se descuente solo en la sede donde
se vende y que una venta multi-ítem inviable no deje rastro parcial. Usan la base
`librestock_test`, aparte de la de desarrollo, y la eliminan al terminar.

### MongoDB local con replica set

Las transacciones del kardex **exigen** un replica set: Atlas (incluso M0) sirve, pero un
`mongod` suelto no. Para trabajar sin Atlas, un nodo único en Docker basta:

```bash
docker run -d --name librestock-mongo -p 27017:27017 \
  -v librestock-mongo-data:/data/db mongo:7 --replSet rs0 --bind_ip_all
docker exec librestock-mongo mongosh --quiet --eval \
  'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
```

Luego, en `.env`: `MONGO_URI=mongodb://localhost:27017/librestock?replicaSet=rs0`.
Las pruebas de integración usan `MONGO_URI_TEST` si está definida; si no, ese mismo servidor
local sobre la base `librestock_test`.
