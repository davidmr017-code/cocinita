/**
 * ============================================================================
 * STORE GLOBAL — Zustand + persistencia local
 * ============================================================================
 * Actúa como "repositorio" de la app: la UI solo conoce estas acciones,
 * nunca toca el almacenamiento directamente (SOLID - D, inversión de
 * dependencias). Hoy persiste en localStorage; mañana puede persistir en
 * SQLite (Capacitor) o sincronizar con Supabase cambiando solo esta capa.
 *
 * Reglas de negocio importantes que viven aquí:
 *  - Todo cambio de stock queda registrado como MovimientoStock (historial).
 *  - Marcar un ítem de la lista como "comprado" SUMA automáticamente al
 *    inventario (y desmarcarlo lo revierte).
 *  - "Cocinar" una receta DESCUENTA sus ingredientes de la despensa.
 *  - La lista se regenera desde recetas o desde el menú semanal sin perder
 *    los apuntes manuales ni lo ya comprado.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type {
  Amigo,
  CategoriaIngrediente,
  EntradaMenu,
  Ingrediente,
  ItemDespensa,
  ItemListaCompra,
  MiembroHogar,
  MovimientoStock,
  PerfilHogar,
  ProductoEscaneado,
  PublicacionFeed,
  Receta,
  SolicitudReceta,
  TicketCompra,
  TipoComida,
  TipoMovimiento,
  Unidad,
  UnidadBase,
} from '../domain/tipos';
import { aUnidadBase, baseDe } from '../domain/unidades';
import { aFechaISO, estadoCaducidad, normalizar, nuevoId } from '../domain/utilidades';
import { calcularIngredientesFaltantes, type SeleccionReceta } from '../services/compras';
import { COLORES_MIEMBRO } from '../services/perfil';
import { escalarIngredientes } from '../services/recetas';
import {
  AMIGOS_SEED,
  DESPENSA_SEED,
  FEED_SEED,
  INGREDIENTES_SEED,
  LISTA_SEED,
  MENU_SEED,
  MOVIMIENTOS_SEED,
  PERFIL_SEED,
  RECETAS_SEED,
  SOLICITUDES_SEED,
} from '../data/seed';

interface EstadoApp {
  /* ------------------------------ Datos ------------------------------ */
  ingredientes: Ingrediente[];
  recetas: Receta[];
  despensa: ItemDespensa[];
  movimientos: MovimientoStock[];
  listaCompra: ItemListaCompra[];
  menu: EntradaMenu[];
  amigos: Amigo[];
  feed: PublicacionFeed[];
  solicitudes: SolicitudReceta[];
  perfil: PerfilHogar;
  gastos: TicketCompra[];

  /* --------------------------- Inventario ---------------------------- */
  ajustarStock: (ingredienteId: string, delta: number, tipo: TipoMovimiento, nota?: string) => void;
  asegurarIngrediente: (nombre: string, categoria: CategoriaIngrediente, unidadBase: UnidadBase, imagen?: string) => string;
  registrarProductoEscaneado: (producto: ProductoEscaneado, cantidad: number, caducidad?: string) => void;
  fijarCaducidad: (ingredienteId: string, caducidad: string | undefined) => void;
  fijarStockMinimo: (ingredienteId: string, stockMinimo: number) => void;
  /** Quita el producto de la despensa (el catálogo se mantiene por si hay recetas). */
  eliminarDeDespensa: (ingredienteId: string) => void;
  /** Edita la ficha del producto: nombre, marca, supermercado, unidad, categoría. */
  actualizarIngrediente: (
    ingredienteId: string,
    cambios: Partial<Pick<Ingrediente, 'nombre' | 'marca' | 'supermercado' | 'unidadBase' | 'categoria'>>,
  ) => void;
  /** Fija la cantidad exacta en despensa (registra el ajuste en el historial). */
  fijarCantidad: (ingredienteId: string, cantidad: number) => void;
  /** Aplica de golpe varias propuestas de categoría (reorganizador). */
  aplicarCategorias: (cambios: { ingredienteId: string; categoria: CategoriaIngrediente }[]) => void;

  /* ----------------------------- Recetas ----------------------------- */
  guardarReceta: (receta: Receta) => void;
  eliminarReceta: (recetaId: string) => void;
  alternarFavorita: (recetaId: string) => void;
  cocinarReceta: (recetaId: string, raciones: number) => void;

  /* ------------------------ Lista de la compra ----------------------- */
  generarListaDesdeRecetas: (selecciones: SeleccionReceta[]) => number;
  generarListaDesdeMenu: () => number;
  alternarComprado: (itemId: string) => void;
  anadirItemManual: (nombre: string, cantidad: number, unidad: Unidad) => void;
  eliminarItemLista: (itemId: string) => void;
  limpiarComprados: () => void;

  /* -------------------------- Menú semanal --------------------------- */
  anadirAlMenu: (fecha: string, comida: TipoComida, recetaId: string, raciones: number) => void;
  quitarDelMenu: (entradaId: string) => void;
  moverEntradaMenu: (entradaId: string, fecha: string, comida: TipoComida) => void;

  /* ------------------------------ Social ----------------------------- */
  alternarMeGusta: (publicacionId: string) => void;
  pedirReceta: (amigoId: string, mensaje: string) => void;

  /* ------------------------------ Perfil ----------------------------- */
  actualizarNombreHogar: (nombre: string) => void;
  guardarMiembro: (miembro: MiembroHogar) => void;
  eliminarMiembro: (miembroId: string) => void;
  anadirMiembro: (nombre: string) => string;

  /* ------------------------------ Gastos ----------------------------- */
  guardarTicket: (ticket: TicketCompra) => void;
  eliminarTicket: (ticketId: string) => void;

  /* ----------------------------- Ajustes ----------------------------- */
  importarDatos: (datos: DatosBackup) => void;
  restablecerDatos: () => void;
}

/** Forma del JSON de copia de seguridad. */
export interface DatosBackup {
  version: number;
  exportadoEn: string;
  ingredientes: Ingrediente[];
  recetas: Receta[];
  despensa: ItemDespensa[];
  movimientos: MovimientoStock[];
  listaCompra: ItemListaCompra[];
  menu: EntradaMenu[];
  amigos: Amigo[];
  feed: PublicacionFeed[];
  solicitudes: SolicitudReceta[];
  perfil?: PerfilHogar;
  gastos?: TicketCompra[];
}

/** Estado de ejemplo (también se usa al crear un hogar en la nube). */
export const DATOS_SEED = {
  ingredientes: INGREDIENTES_SEED,
  recetas: RECETAS_SEED,
  despensa: DESPENSA_SEED,
  movimientos: MOVIMIENTOS_SEED,
  listaCompra: LISTA_SEED,
  menu: MENU_SEED,
  amigos: AMIGOS_SEED,
  feed: FEED_SEED,
  solicitudes: SOLICITUDES_SEED,
  perfil: PERFIL_SEED,
  gastos: [] as TicketCompra[],
};

export const useAppStore = create<EstadoApp>()(
  persist(
    (set, get) => ({
      ingredientes: INGREDIENTES_SEED,
      recetas: RECETAS_SEED,
      despensa: DESPENSA_SEED,
      movimientos: MOVIMIENTOS_SEED,
      listaCompra: LISTA_SEED,
      menu: MENU_SEED,
      amigos: AMIGOS_SEED,
      feed: FEED_SEED,
      solicitudes: SOLICITUDES_SEED,
      perfil: PERFIL_SEED,
      gastos: [],

      /* ============================ INVENTARIO ============================ */

      /**
       * Único punto de entrada para modificar stock: garantiza que TODO
       * cambio quede auditado en el historial de movimientos.
       */
      ajustarStock: (ingredienteId, delta, tipo, nota) =>
        set((estado) => {
          const existe = estado.despensa.some((i) => i.ingredienteId === ingredienteId);
          const despensa = existe
            ? estado.despensa.map((item) =>
                item.ingredienteId === ingredienteId
                  ? { ...item, cantidad: Math.max(0, item.cantidad + delta) }
                  : item,
              )
            : [
                ...estado.despensa,
                {
                  ingredienteId,
                  cantidad: Math.max(0, delta),
                  stockMinimo: 1,
                  anadidoEn: new Date().toISOString(),
                },
              ];

          const movimiento: MovimientoStock = {
            id: nuevoId(),
            ingredienteId,
            delta,
            tipo,
            fecha: new Date().toISOString(),
            nota,
          };
          return { despensa, movimientos: [movimiento, ...estado.movimientos] };
        }),

      /**
       * Alta o actualización de ingrediente en el catálogo.
       * Si ya existe (mismo nombre), actualiza categoría/unidad/imagen cuando
       * el escaneo aporta datos más precisos.
       */
      asegurarIngrediente: (nombre, categoria, unidadBase, imagen) => {
        const existente = get().ingredientes.find(
          (i) => normalizar(i.nombre) === normalizar(nombre),
        );

        if (existente) {
          // Refinar categoría si antes era "otros" o si el escaneo trae mejor dato.
          const categoriaMejor =
            existente.categoria === 'otros' && categoria !== 'otros'
              ? categoria
              : existente.categoria;

          set((estado) => ({
            ingredientes: estado.ingredientes.map((i) =>
              i.id === existente.id
                ? {
                    ...i,
                    categoria: categoriaMejor,
                    unidadBase,
                    imagen: imagen ?? i.imagen,
                  }
                : i,
            ),
          }));
          return existente.id;
        }

        const nuevo: Ingrediente = {
          id: nuevoId(),
          nombre: nombre.trim(),
          categoria,
          unidadBase,
          imagen,
        };
        set((estado) => ({ ingredientes: [...estado.ingredientes, nuevo] }));
        return nuevo.id;
      },

      /** Producto escaneado → categorizado y añadido a la despensa con la unidad correcta. */
      registrarProductoEscaneado: (producto, unidadesEscaneadas, caducidad) => {
        const id = get().asegurarIngrediente(
          producto.nombre,
          producto.categoria,
          producto.unidadBase,
          producto.imagen,
        );
        const delta = unidadesEscaneadas * producto.cantidadEmpaque;
        get().ajustarStock(
          id,
          delta,
          'compra',
          `Escaneado (${producto.codigo}) · ${producto.categoria}`,
        );
        if (caducidad) get().fijarCaducidad(id, caducidad);
      },

      fijarCaducidad: (ingredienteId, caducidad) =>
        set((estado) => {
          const existe = estado.despensa.some((i) => i.ingredienteId === ingredienteId);
          if (!existe) {
            return {
              despensa: [
                ...estado.despensa,
                { ingredienteId, cantidad: 0, stockMinimo: 1, caducidad },
              ],
            };
          }
          return {
            despensa: estado.despensa.map((item) =>
              item.ingredienteId === ingredienteId
                ? { ...item, caducidad: caducidad || undefined }
                : item,
            ),
          };
        }),

      fijarStockMinimo: (ingredienteId, stockMinimo) =>
        set((estado) => ({
          despensa: estado.despensa.map((item) =>
            item.ingredienteId === ingredienteId
              ? { ...item, stockMinimo: Math.max(0, stockMinimo) }
              : item,
          ),
        })),

      eliminarDeDespensa: (ingredienteId) =>
        set((estado) => {
          const item = estado.despensa.find((i) => i.ingredienteId === ingredienteId);
          if (!item) return estado;
          const movimiento: MovimientoStock = {
            id: nuevoId(),
            ingredienteId,
            delta: -item.cantidad,
            tipo: 'ajuste',
            fecha: new Date().toISOString(),
            nota: 'Eliminado de la despensa',
          };
          return {
            despensa: estado.despensa.filter((i) => i.ingredienteId !== ingredienteId),
            movimientos: [movimiento, ...estado.movimientos],
          };
        }),

      actualizarIngrediente: (ingredienteId, cambios) =>
        set((estado) => ({
          ingredientes: estado.ingredientes.map((i) =>
            i.id === ingredienteId
              ? {
                  ...i,
                  ...cambios,
                  nombre: cambios.nombre?.trim() || i.nombre,
                  marca: cambios.marca !== undefined ? cambios.marca.trim() || undefined : i.marca,
                  supermercado:
                    cambios.supermercado !== undefined
                      ? cambios.supermercado.trim() || undefined
                      : i.supermercado,
                }
              : i,
          ),
        })),

      fijarCantidad: (ingredienteId, cantidad) => {
        const item = get().despensa.find((i) => i.ingredienteId === ingredienteId);
        const objetivo = Math.max(0, cantidad);
        const delta = objetivo - (item?.cantidad ?? 0);
        if (delta === 0) return;
        get().ajustarStock(ingredienteId, delta, 'ajuste', 'Cantidad corregida a mano');
      },

      aplicarCategorias: (cambios) =>
        set((estado) => {
          if (cambios.length === 0) return estado;
          const mapa = new Map(cambios.map((c) => [c.ingredienteId, c.categoria]));
          return {
            ingredientes: estado.ingredientes.map((i) =>
              mapa.has(i.id) ? { ...i, categoria: mapa.get(i.id)! } : i,
            ),
          };
        }),

      /* ============================= RECETAS ============================= */

      /** Crea o actualiza una receta (upsert por id). */
      guardarReceta: (receta) =>
        set((estado) => {
          const existe = estado.recetas.some((r) => r.id === receta.id);
          return {
            recetas: existe
              ? estado.recetas.map((r) => (r.id === receta.id ? receta : r))
              : [receta, ...estado.recetas],
          };
        }),

      eliminarReceta: (recetaId) =>
        set((estado) => ({
          recetas: estado.recetas.filter((r) => r.id !== recetaId),
          // Limpieza referencial: el menú no puede apuntar a recetas borradas.
          menu: estado.menu.filter((e) => e.recetaId !== recetaId),
        })),

      alternarFavorita: (recetaId) =>
        set((estado) => ({
          recetas: estado.recetas.map((r) =>
            r.id === recetaId ? { ...r, favorita: !r.favorita } : r,
          ),
        })),

      /**
       * "He cocinado esta receta": descuenta del inventario los ingredientes
       * usados (escalados a las raciones cocinadas) y la marca como aprendida.
       */
      cocinarReceta: (recetaId, raciones) => {
        const receta = get().recetas.find((r) => r.id === recetaId);
        if (!receta) return;

        for (const ing of escalarIngredientes(receta, raciones)) {
          const { cantidad } = aUnidadBase(ing.cantidad, ing.unidad);
          get().ajustarStock(ing.ingredienteId, -cantidad, 'cocinado', receta.titulo);
        }
        set((estado) => ({
          recetas: estado.recetas.map((r) =>
            r.id === recetaId ? { ...r, aprendida: true } : r,
          ),
        }));
      },

      /* ======================= LISTA DE LA COMPRA ======================== */

      /**
       * Cruza recetas seleccionadas × despensa y reconstruye la parte
       * automática de la lista. Se conservan los apuntes manuales y lo ya
       * comprado. Devuelve cuántos ingredientes faltan (para feedback UI).
       */
      generarListaDesdeRecetas: (selecciones) => {
        const { despensa, ingredientes, listaCompra } = get();
        const faltantes = calcularIngredientesFaltantes(selecciones, despensa, ingredientes);

        const conservados = listaCompra.filter((item) => item.manual || item.comprado);
        // No duplicar: si un faltante ya está comprado/manual en la lista, lo omitimos.
        const idsConservados = new Set(conservados.map((i) => i.ingredienteId).filter(Boolean));

        const nuevos: ItemListaCompra[] = faltantes
          .filter((f) => !idsConservados.has(f.ingredienteId))
          .map((f) => ({
            id: nuevoId(),
            ingredienteId: f.ingredienteId,
            nombre: f.nombre,
            cantidad: f.cantidad,
            unidad: f.unidadBase,
            recetaIds: f.recetaIds,
            comprado: false,
            manual: false,
          }));

        set({ listaCompra: [...nuevos, ...conservados] });
        return faltantes.length;
      },

      /** Lista GLOBAL de la semana: agrega todas las entradas del menú. */
      generarListaDesdeMenu: () => {
        const { menu, recetas } = get();
        const porReceta = new Map<string, number>();
        // Suma raciones si la misma receta aparece varias veces en la semana.
        for (const entrada of menu) {
          porReceta.set(entrada.recetaId, (porReceta.get(entrada.recetaId) ?? 0) + entrada.raciones);
        }
        const selecciones: SeleccionReceta[] = [...porReceta.entries()]
          .map(([recetaId, raciones]) => {
            const receta = recetas.find((r) => r.id === recetaId);
            return receta ? { receta, raciones } : null;
          })
          .filter((s): s is SeleccionReceta => s !== null);

        return get().generarListaDesdeRecetas(selecciones);
      },

      /**
       * Checkbox interactivo: al marcar "comprado" el ingrediente ENTRA en el
       * inventario automáticamente; al desmarcar, se revierte la entrada.
       */
      alternarComprado: (itemId) => {
        const item = get().listaCompra.find((i) => i.id === itemId);
        if (!item) return;

        const pasaAComprado = !item.comprado;

        // Los apuntes manuales también alimentan el inventario: si no existen
        // en el catálogo se dan de alta con la unidad indicada.
        let ingredienteId = item.ingredienteId;
        if (!ingredienteId && pasaAComprado) {
          ingredienteId = get().asegurarIngrediente(item.nombre, 'otros', baseDe(item.unidad));
        }

        if (ingredienteId) {
          const { cantidad } = aUnidadBase(item.cantidad, item.unidad);
          get().ajustarStock(
            ingredienteId,
            pasaAComprado ? cantidad : -cantidad,
            'compra',
            pasaAComprado ? 'Lista de la compra' : 'Compra deshecha',
          );
        }

        set((estado) => ({
          listaCompra: estado.listaCompra.map((i) =>
            i.id === itemId ? { ...i, comprado: pasaAComprado, ingredienteId } : i,
          ),
        }));
      },

      anadirItemManual: (nombre, cantidad, unidad) =>
        set((estado) => ({
          listaCompra: [
            {
              id: nuevoId(),
              nombre: nombre.trim(),
              cantidad,
              unidad,
              recetaIds: [],
              comprado: false,
              manual: true,
            },
            ...estado.listaCompra,
          ],
        })),

      eliminarItemLista: (itemId) =>
        set((estado) => ({
          listaCompra: estado.listaCompra.filter((i) => i.id !== itemId),
        })),

      limpiarComprados: () =>
        set((estado) => ({
          listaCompra: estado.listaCompra.filter((i) => !i.comprado),
        })),

      /* =========================== MENÚ SEMANAL ========================== */

      anadirAlMenu: (fecha, comida, recetaId, raciones) =>
        set((estado) => ({
          menu: [...estado.menu, { id: nuevoId(), fecha, comida, recetaId, raciones }],
        })),

      quitarDelMenu: (entradaId) =>
        set((estado) => ({ menu: estado.menu.filter((e) => e.id !== entradaId) })),

      /** Soporta el drag & drop del planificador: mover a otro día/comida. */
      moverEntradaMenu: (entradaId, fecha, comida) =>
        set((estado) => ({
          menu: estado.menu.map((e) => (e.id === entradaId ? { ...e, fecha, comida } : e)),
        })),

      /* ============================== SOCIAL ============================= */

      alternarMeGusta: (publicacionId) =>
        set((estado) => ({
          feed: estado.feed.map((p) =>
            p.id === publicacionId
              ? { ...p, meGusta: !p.meGusta, likes: p.likes + (p.meGusta ? -1 : 1) }
              : p,
          ),
        })),

      pedirReceta: (amigoId, mensaje) =>
        set((estado) => ({
          solicitudes: [
            {
              id: nuevoId(),
              amigoId,
              mensaje,
              estado: 'pendiente',
              fecha: new Date().toISOString(),
            },
            ...estado.solicitudes,
          ],
        })),

      /* ============================== PERFIL ============================= */

      actualizarNombreHogar: (nombre) =>
        set((estado) => ({
          perfil: { ...estado.perfil, nombreHogar: nombre.trim() || estado.perfil.nombreHogar },
        })),

      anadirMiembro: (nombre) => {
        const id = nuevoId();
        const color = COLORES_MIEMBRO[get().perfil.miembros.length % COLORES_MIEMBRO.length];
        const nuevo: MiembroHogar = {
          id,
          nombre: nombre.trim() || 'Nuevo miembro',
          color,
          alergenos: [],
          preferencias: [],
          evitados: [],
        };
        set((estado) => ({
          perfil: { ...estado.perfil, miembros: [...estado.perfil.miembros, nuevo] },
        }));
        return id;
      },

      guardarMiembro: (miembro) =>
        set((estado) => ({
          perfil: {
            ...estado.perfil,
            miembros: estado.perfil.miembros.map((m) => (m.id === miembro.id ? miembro : m)),
          },
        })),

      eliminarMiembro: (miembroId) =>
        set((estado) => {
          if (estado.perfil.miembros.length <= 1) return estado;
          return {
            perfil: {
              ...estado.perfil,
              miembros: estado.perfil.miembros.filter((m) => m.id !== miembroId),
            },
          };
        }),

      /* ============================== GASTOS ============================= */

      guardarTicket: (ticket) =>
        set((estado) => {
          const idx = estado.gastos.findIndex((t) => t.id === ticket.id);
          if (idx >= 0) {
            const gastos = [...estado.gastos];
            gastos[idx] = { ...ticket, actualizadoEn: new Date().toISOString() };
            return { gastos };
          }
          return { gastos: [{ ...ticket }, ...estado.gastos] };
        }),

      eliminarTicket: (ticketId) =>
        set((estado) => ({
          gastos: estado.gastos.filter((t) => t.id !== ticketId),
        })),

      /* ============================== AJUSTES ============================ */

      importarDatos: (datos) =>
        set({
          ingredientes: datos.ingredientes,
          recetas: datos.recetas,
          despensa: datos.despensa,
          movimientos: datos.movimientos,
          listaCompra: datos.listaCompra,
          menu: datos.menu,
          amigos: datos.amigos,
          feed: datos.feed,
          solicitudes: datos.solicitudes,
          perfil: datos.perfil ?? PERFIL_SEED,
          gastos: Array.isArray(datos.gastos) ? datos.gastos : [],
        }),

      restablecerDatos: () => set({ ...DATOS_SEED }),
    }),
    {
      name: 'cocinita-datos',
      version: 4,
      migrate: (persisted, version) => {
        const estado = persisted as Partial<EstadoApp>;
        if (version < 2 && Array.isArray(estado.despensa)) {
          estado.despensa = estado.despensa.map((item) => ({
            ...item,
            caducidad: item.caducidad,
          }));
        }
        if (version < 3 && !estado.perfil) {
          estado.perfil = PERFIL_SEED;
        }
        if (version < 4 && !Array.isArray(estado.gastos)) {
          estado.gastos = [];
        }
        return estado as EstadoApp;
      },
    },
  ),
);

/* --------------------------- Selectores útiles ---------------------------- */

/** Ítems con stock por debajo del mínimo (pero no agotados). */
export function seleccionarPocoStock(despensa: ItemDespensa[]): ItemDespensa[] {
  return despensa.filter((i) => i.cantidad > 0 && i.cantidad < i.stockMinimo);
}

/** Ítems agotados: responden a "¿qué ingredientes se han acabado?". */
export function seleccionarAgotados(despensa: ItemDespensa[]): ItemDespensa[] {
  return despensa.filter((i) => i.cantidad <= 0);
}

/** Ítems caducados o que caducan en ≤3 días (con stock > 0). */
export function seleccionarCaducanPronto(despensa: ItemDespensa[]): ItemDespensa[] {
  return despensa.filter((i) => {
    if (i.cantidad <= 0) return false;
    const estado = estadoCaducidad(i.caducidad);
    return estado === 'caducado' || estado === 'pronto';
  });
}

/** Fecha de hoy en formato YYYY-MM-DD (para el planificador). */
export function hoyISO(): string {
  return aFechaISO(new Date());
}
