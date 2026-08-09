/**
 * ============================================================================
 * SERVICIO DE LISTA DE LA COMPRA — el corazón de la app
 * ============================================================================
 * Cruza las recetas seleccionadas (o el menú semanal completo) con el
 * inventario actual y devuelve exactamente lo que falta por comprar.
 *
 * Eficiencia: una sola pasada sobre los ingredientes de las recetas para
 * agregar necesidades (Map) + una resta O(1) contra el stock indexado.
 * Complejidad total O(R×I + P), sin consultas anidadas.
 */
import type {
  Ingrediente,
  ItemDespensa,
  Receta,
  UnidadBase,
} from '../domain/tipos';
import { aUnidadBase } from '../domain/unidades';
import { escalarIngredientes } from './recetas';

/** Una receta elegida para cocinar, con las raciones deseadas. */
export interface SeleccionReceta {
  receta: Receta;
  raciones: number;
}

/** Resultado del cruce: un ingrediente que falta (total o parcialmente). */
export interface Faltante {
  ingredienteId: string;
  nombre: string;
  /** Cantidad que falta, expresada en la unidad base del ingrediente. */
  cantidad: number;
  unidadBase: UnidadBase;
  /** Recetas que necesitan este ingrediente (para mostrar "para: Pasta..."). */
  recetaIds: string[];
}

/**
 * FUNCIÓN CLAVE: calcula los ingredientes faltantes para cocinar un conjunto
 * de recetas (con sus raciones) dado el inventario actual.
 *
 * Algoritmo:
 *  1. AGREGAR   — suma las necesidades de todas las recetas por ingrediente,
 *                 escalando raciones y normalizando unidades a la base.
 *  2. RESTAR    — descuenta el stock disponible en la despensa.
 *  3. FILTRAR   — devuelve solo lo que queda en positivo (lo que falta).
 */
export function calcularIngredientesFaltantes(
  selecciones: SeleccionReceta[],
  despensa: ItemDespensa[],
  catalogo: Ingrediente[],
): Faltante[] {
  // Índices O(1): stock por ingrediente y ficha del catálogo por id.
  const stock = new Map(despensa.map((i) => [i.ingredienteId, i.cantidad]));
  const fichas = new Map(catalogo.map((i) => [i.id, i]));

  // 1) AGREGAR: necesidades totales por ingrediente (en unidad base).
  const necesidades = new Map<string, { cantidad: number; recetaIds: Set<string> }>();
  for (const { receta, raciones } of selecciones) {
    for (const ing of escalarIngredientes(receta, raciones)) {
      const { cantidad } = aUnidadBase(ing.cantidad, ing.unidad);
      const acumulado = necesidades.get(ing.ingredienteId) ?? {
        cantidad: 0,
        recetaIds: new Set<string>(),
      };
      acumulado.cantidad += cantidad;
      acumulado.recetaIds.add(receta.id);
      necesidades.set(ing.ingredienteId, acumulado);
    }
  }

  // 2) RESTAR stock y 3) FILTRAR lo que sigue faltando.
  const faltantes: Faltante[] = [];
  for (const [ingredienteId, { cantidad, recetaIds }] of necesidades) {
    const disponible = stock.get(ingredienteId) ?? 0;
    const falta = cantidad - disponible;
    if (falta <= 0) continue; // hay suficiente en casa

    const ficha = fichas.get(ingredienteId);
    faltantes.push({
      ingredienteId,
      nombre: ficha?.nombre ?? ingredienteId,
      cantidad: Math.ceil(falta * 100) / 100, // redondeo hacia arriba: mejor que sobre
      unidadBase: ficha?.unidadBase ?? 'ud',
      recetaIds: [...recetaIds],
    });
  }

  // Orden alfabético estable para una lista predecible en la UI.
  return faltantes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
