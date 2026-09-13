# 🥘 Cocinita — Recetas inteligentes y control de despensa

Aplicación **mobile-first** (web + PWA) de gestión de recetas caseras, inventario
de despensa/nevera y lista de la compra dinámica. El diseño visual proviene del
kit Stitch `stitch_smart_pantry_recipe_hub` (sistema de diseño **"Cocinita"**:
verde salvia + terracota, Literata + Plus Jakarta Sans).

## Arranque rápido

```bash
npm install
npm run dev      # https://localhost:5173  (HTTPS necesario para la cámara en móvil)
npm run build    # compilación de producción
```

## Hogar familiar (Postgres en Railway)

Toda la familia comparte la misma despensa, recetas, lista y menú. El frontend
sigue en Vercel; la API + Postgres viven en Railway.

### 1. Postgres + API en Railway

1. En [railway.app](https://railway.app) → **New Project** → **Add PostgreSQL**.
2. **Add Service** → **GitHub Repo** → este repositorio.
3. En el servicio Node: **Settings → Root Directory** = `server`.
4. Variables del servicio API (Variables):

| Variable | Valor |
|----------|--------|
| `DATABASE_URL` | (referencia a la de Postgres; Railway la inyecta o usa `${{Postgres.DATABASE_URL}}`) |
| `DATABASE_SSL` | `true` |
| `JWT_SECRET` | una cadena larga aleatoria |
| `CORS_ORIGINS` | `https://tu-app.vercel.app` (y `http://localhost:5173` si pruebas en local) |
| `GROQ_API_KEY` | clave gratuita de [console.groq.com](https://console.groq.com) para el Chef IA (opcional) |
| `GROQ_MODEL` | opcional; por defecto `openai/gpt-oss-120b` (Groq retiró Llama 3.3 70B el 16 ago 2026) |
| `PORT` | lo asigna Railway solo; no hace falta fijarlo |

5. Deploy. Comprueba `https://tu-api.up.railway.app/health` → `{ ok: true }`.

El esquema (`hogares`, `usuarios`, `estados_hogar`) se crea solo al arrancar.

### 2. Frontend en Vercel

1. Importa el repo en Vercel (framework Vite, output `dist`).
2. Añade variable de entorno:

| Variable | Valor |
|----------|--------|
| `VITE_API_URL` | `https://tu-api.up.railway.app` (sin barra final) |

3. Redeploy. Al abrir la app verás **Crear hogar** / **Unirme**.
4. Comparte el código `COCI-XXXX` (Ajustes) con la familia; el PIN es opcional.

### Desarrollo local con API

```bash
# Terminal 1 — Postgres local o DATABASE_URL de Railway
cp server/.env.example server/.env   # edita DATABASE_URL y JWT_SECRET
npm --prefix server install
npm run dev:full                     # Vite (:5173) + API (:3080)
```

Sin `VITE_API_URL`, Vite hace proxy de `/api/auth`, `/api/state` y `/api/hogar`
hacia `localhost:3080`. Open Food Facts sigue en `/api/openfoodfacts`.

### Abrir desde el móvil (escáner incluido)

La cámara **solo funciona con HTTPS** (no con `http://192.168.x.x`). El servidor de desarrollo ya usa SSL automático:

1. Arranca `npm run dev` y copia la URL **https://192.168.x.x:5173/**
2. En el móvil, acepta el aviso de certificado no confiable (es normal en desarrollo)
3. Ve a **Escanear** y permite el acceso a la cámara

## Tech stack

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| UI | **React 19 + TypeScript + Vite** | Ecosistema maduro, tipado estricto, arranque instantáneo |
| Estilos | **Tailwind CSS v4** | El diseño Stitch ya está expresado en tokens Tailwind; se trasladaron tal cual a `@theme` |
| Estado/Datos | **Zustand + persist** | Cache local; en modo familia se sincroniza con la API |
| Sync familiar | **Express + Postgres (Railway)** | Un hogar, código `COCI-XXXX`, estado JSONB versionado |
| Rutas | **React Router 7** | Navegación por pestañas + detalle |
| Datos externos | **Open Food Facts API** | Ingredientes de productos escaneados, sin clave de API |
| Frontend prod | **Vercel** | SPA + proxy Open Food Facts |
| Futuro móvil nativo | **Capacitor + SQLite** | El mismo código React se empaqueta para iOS/Android |

## Estructura (SOLID por capas)

```
src/
├── domain/        # Modelos y reglas puras (tipos.ts, unidades.ts, utilidades.ts)
├── services/      # Lógica de negocio pura y testeable
│   ├── recetas.ts     # escalado de raciones, filtros, receta aleatoria
│   ├── compras.ts     # ⭐ calcularIngredientesFaltantes (cruce recetas×despensa)
│   └── productos.ts   # Open Food Facts (escáner)
├── store/         # Zustand: repositorio + orquestación (persistencia local)
├── data/          # Datos semilla con imágenes del kit de diseño
├── components/    # UI reutilizable (tarjetas, chips, steppers, navegación)
└── screens/       # Pantallas (explorador, detalle, despensa, compra, menú...)
```

- **S**: cada servicio/pantalla tiene una única responsabilidad.
- **O**: añadir unidades o categorías = ampliar tablas, sin tocar lógica.
- **D**: la UI depende del store y los servicios, nunca del almacenamiento.

## Esquema de datos (ver `src/domain/tipos.ts`)

- `Ingrediente` — catálogo maestro (tabla pivote de toda la app)
- `Receta` + `IngredienteReceta` + `PasoReceta` — recetario con raciones base
- `ItemDespensa` — stock en unidad canónica (g / ml / ud) + stock mínimo
- `MovimientoStock` — historial auditado: compra / consumo / cocinado / ajuste
- `ItemListaCompra` — lista dinámica con trazabilidad a recetas
- `EntradaMenu` — planificador semanal (fecha + comida/cena + raciones)
- `Amigo`, `PublicacionFeed`, `SolicitudReceta` — capa social

## Reglas de negocio clave

1. **Escalado de raciones**: las cantidades se recalculan con factor
   `racionesObjetivo / racionesBase` (en vivo, en el detalle de receta).
2. **Cruce en tiempo real**: `calcularIngredientesFaltantes()` agrega las
   necesidades de N recetas (Map, O(R×I + P)) y resta el stock indexado.
3. **Checkbox que compra**: marcar un ítem como comprado suma la cantidad al
   inventario y registra el movimiento; desmarcar lo revierte.
4. **Cocinar descuenta**: al terminar el modo cocina, los ingredientes usados
   salen de la despensa automáticamente.
5. **Menú semanal → lista global**: todas las entradas de la semana se agregan
   antes del cruce, comprando cada ingrediente una sola vez.
