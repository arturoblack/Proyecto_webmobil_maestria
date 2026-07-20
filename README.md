# LibreStock 📚

Aplicación web responsiva full stack para la gestión de **stock, almacén y ventas** de librerías
y papelerías con múltiples ubicaciones. Producto Académico Colaborativo — *Desarrollo de
Aplicaciones Web y Móviles*, Maestría en Ingeniería de Software, Universidad Continental.

| Carpeta | Contenido | Guía |
|---|---|---|
| `server/` | API REST (Node.js + Express + MongoDB Atlas, JWT con roles) | [server/README.md](server/README.md) |
| `client/` | SPA (React 18 + Vite + Bootstrap 5, estilo "vidrio de papelería") | [client/README.md](client/README.md) |

**➡ Para continuar el desarrollo con Claude Code, todo el contexto está en [`CLAUDE.md`](CLAUDE.md)**
(dominio, reglas de negocio inquebrantables, estándares de calidad, mapa RF→código y pendientes).

## Arranque rápido

```bash
cd server && cp .env.example .env && npm install && npm run seed && npm run dev
cd client && cp .env.example .env && npm install && npm run dev
```

Credenciales de demostración: `admin/admin123` (administrador) · `rosa/rosa123` (vendedora).

## Equipo

Ivan Arturo Bolaños Victoria · Jossip Jair Escalaya Juarez · Alejandro Andrés Fernández
Alejandro · Carlos Eduardo Puma Mendoza
