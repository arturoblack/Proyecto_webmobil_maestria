# CLAUDE.md — Contexto del proyecto LibreStock

> Este archivo lo lee automáticamente Claude Code al abrir el repositorio. Contiene todo el
> contexto necesario para continuar el desarrollo sin re-explicar el proyecto.

## Qué es este proyecto

**LibreStock**: aplicación web responsiva full stack para la gestión de stock, almacén y ventas
de librerías y papelerías peruanas con múltiples ubicaciones (almacenes + tiendas).

Es el **Producto Académico Colaborativo** del curso *Desarrollo de Aplicaciones Web y Móviles*
(Maestría en Ingeniería de Software, Universidad Continental). Existe una **memoria técnica en
Word** que es la fuente de verdad del alcance: `PAC_LibreStock_DesarrolloAppsWebMoviles.docx`.
Cualquier cambio de alcance debe reflejarse también en ese documento.

- Equipo: Ivan Bolaños (líder/back), Jossip Escalaya (front), Alejandro Fernández (UX/Figma),
  Carlos Puma (QA/pruebas).
- La tarea NO exige terminar el 100% del código: el núcleo (stock, movimientos, ventas) debe
  quedar completo; los flujos complementarios pueden quedar en versión mínima viable.

## Estructura del repositorio

```
server/   API REST — Node.js + Express + Mongoose (MongoDB Atlas), JWT con roles
client/   SPA — React 18 + Vite + Bootstrap 5 + react-router, estilo "vidrio de papelería"
```

## Cómo levantar el entorno

```bash
# Back-end
cd server && cp .env.example .env    # completar MONGO_URI (Atlas) y JWT_SECRET
npm install && npm run seed && npm run dev    # puerto 5001; admin/admin123, rosa/rosa123

# Front-end (otra terminal)
cd client && cp .env.example .env    # VITE_API_URL=http://localhost:5001
npm install && npm run dev           # puerto 5180 (vite.config.js, strictPort)

# Calidad
cd server && npm test && npm run lint
cd client && npm run lint
```

⚠️ Las transacciones de Mongoose requieren replica set: Atlas (incluso M0 gratis) funciona;
un mongod local suelto NO.

## Dominio y reglas de negocio (NO romper jamás)

1. **El stock pertenece al par producto–ubicación** (colección `stocks`, índice único
   `{product, location}`). Un producto no tiene "un stock": tiene uno por sede.
2. **El kardex es la fuente de verdad**: TODA mutación de existencias pasa por
   `server/services/inventoryService.js → applyMovement()`. Ventas, recepciones de pedidos,
   ajustes y transferencias lo usan. **Nunca** modificar `Stock.quantity` desde otro lugar.
3. El stock **nunca queda negativo**; las transferencias descuentan en origen y abonan en
   destino **dentro de una transacción**; una venta multi-ítem se aplica completa o no se aplica.
4. Las ventas solo proceden en ubicaciones tipo `tienda`; los **precios se toman del catálogo
   en el servidor** (el cliente jamás envía precios).
5. Pedidos de clientes NO afectan stock. La recepción de un pedido a proveedor genera entradas
   automáticas y es irrepetible (control por estado).
6. Roles: `admin` (todo) y `vendedor` (consulta, ventas, pedidos de clientes). Ocultar en el
   menú NUNCA es el único control: el servidor revalida con middlewares en cada ruta.

## Estándares de calidad (sección 5.1 de la memoria — OBLIGATORIOS)

### Back-end: 5 capas con responsabilidad única
| Capa | Regla |
|---|---|
| `routes/` | Solo endpoints + middlewares. Cero lógica. |
| `middlewares/` | `auth.js` (verifyToken, requireAdmin) y `errorHandler.js` (ÚNICO catch global). |
| `controllers/` | Delgados: leen request → llaman servicio → responden. Siempre con `asyncHandler`. |
| `services/` | Toda la lógica de negocio. |
| `models/` | Esquemas Mongoose con validaciones (mensajes en español). |

### Manejo de errores
- Prohibido `try/catch` con `console.error` disperso. Lanzar `ApiError.badRequest/notFound/
  conflict/forbidden(...)` desde servicios/controladores; `errorHandler` traduce todo.
- Contrato uniforme: éxito → recurso; error → `{ message }` con HTTP semántico
  (400 validación, 401 auth, 403 permiso, 404 no existe, 409 conflicto).

### Front-end
- `src/api/client.js` es la ÚNICA instancia de Axios (token y 401 en interceptores). Prohibido
  importar axios directo en páginas o repetir headers.
- `useApi()` para todo fetching (estados uniformes data/loading/error/refresh).
- Único estado global: `AuthContext`. Sin Redux.
- Componentes ≤ ~150 líneas; si crece, dividir. Sin lógica de negocio en el front (el vuelto
  que se muestra es informativo: el servidor recalcula y decide).
- Tokens de diseño SOLO en `src/styles/tokens.css` (paleta Tabla 8): tinta `#1E3A5F`, ámbar
  `#F59E0B`, verde `#198754`, rojo `#DC3545`. Vidrio = clase `.glass` (máx 3-4 por pantalla);
  trazo resaltador = clase `.hl`. Vidrio en superficies, SÓLIDO en acciones (botones `.btn-ink`).
- Responsive: mobile-first, breakpoint clave 992px (barra inferior ↔ menú lateral).

### Convenciones
- Identificadores en **inglés**; mensajes al usuario y comentarios en **español**.
- camelCase (vars/funciones), PascalCase (componentes/modelos), UPPER_SNAKE (constantes).
- Comentarios explican el *porqué*, no narran lo obvio. Cero código muerto, cero
  `console.log` en código final, cero credenciales en el código (todo por `.env`).
- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`).
  Ramas por funcionalidad + revisión de otro integrante antes de merge.

### Lista negra (revisar antes de cada PR)
useEffect con dependencias mal declaradas · componentes-dios · lógica de stock fuera de
inventoryService · formas de respuesta distintas entre endpoints · magic numbers/strings ·
dependencias sin uso · texto lorem ipsum (usar siempre datos del dominio: cuadernos, S/, SKU).

## Mapa RF → código (Tabla 2 de la memoria)

| RF | Qué | Dónde |
|---|---|---|
| RF-01 | Login JWT 8h | `controllers/authController.js` |
| RF-02 | Usuarios y roles (admin) | `userController` + `routes/users.js` |
| RF-03 | Ubicaciones almacén/tienda | `locationController` |
| RF-04 | Catálogo (stock NO editable aquí) | `productController` |
| RF-05/06 | Stock por sede + alertas mínimo | `stockController`, página `Inventory.jsx` |
| RF-07/08 | Entradas/salidas/transferencias (admin) | `movementController` → `inventoryService` |
| RF-09 | Kardex | `movementController.listMovements`, página `Movements.jsx` |
| RF-10 | Pedidos de clientes (no tocan stock) | `customerOrderController` |
| RF-11/12 | Pedidos a proveedor + recepción → entradas | `purchaseOrderController` → `purchaseService` |
| RF-13 | POS: venta multi-ítem, pago simulado | `saleController` → `salesService`, página `Sell.jsx` |
| RF-14 | Dashboard (una sola petición) | `statsController` → `statsService`, página `Dashboard.jsx` |

## Estado actual y pendientes (actualizar al avanzar)

- [x] Fase 1 y alcance en la memoria técnica
- [x] Fase 2: guía de estilo + mockups (móvil y desktop) en la memoria
- [x] Back-end completo (rutas, servicios, modelos, seed, pruebas Jest de reglas críticas)
- [x] Front-end: 10 pantallas, rutas por rol, diseño adaptativo
- [ ] Correr `npm install` + `npm test` + probar flujo completo con Atlas real
- [ ] Prototipo navegable en Figma (Alejandro) + pegar enlace en sección 4.1 de la memoria
- [ ] Despliegue: front en Vercel, back en Render (documentar en sección 5.4)
- [ ] Fase 4: casos de prueba por RF + retroalimentación entre equipos (Carlos)
- [ ] Fase 5: manual de usuario, conclusiones, video pitch ≤10 min en YouTube (link en la
      última página de la memoria) — solo el líder envía el PAC

## Cosas que NO hacer

- No agregar features fuera del alcance (facturación/SUNAT, pagos reales, códigos de barras,
  CRM, devoluciones, offline, exportar PDF/Excel): están **excluidas** en la sección 3.4.
- No editar `Stock.quantity` directamente, ni exponer un endpoint que lo haga.
- No subir `.env` (ya pasó una vez con credenciales de Atlas: la contraseña fue rotada).
- No cambiar la paleta ni meter gradientes morados/neón: la guía de estilo está aprobada.
