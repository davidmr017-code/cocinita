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

## Despliegue en Vercel

1. Sube este repo a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New Project** → importa el repositorio.
3. Framework: **Vite** (detectado automático). Build: `npm run build`, Output: `dist`.
4. Deploy. El archivo `vercel.json` ya incluye:
   - rewrite SPA (`index.html`) para React Router
   - proxy `/api/openfoodfacts` → Open Food Facts (escáner sin CORS)

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
| Estado/Datos | **Zustand + persist** | Store minimalista (~1 KB) que actúa de repositorio local; los datos sobreviven al recargar |
| Rutas | **React Router 7** | Navegación por pestañas + detalle |
| Datos externos | **Open Food Facts API** | Ingredientes de productos escaneados, sin clave de API |
| Futuro móvil nativo | **Capacitor + SQLite** | El mismo código React se empaqueta para iOS/Android |
| Futuro social/sync | **Supabase (Postgres + Auth + Realtime)** | El esquema de dominio es relacional y migra 1:1 |

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
