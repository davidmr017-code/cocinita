/**
 * ============================================================================
 * SERVICIO DE RECETAS — escalado de porciones, filtrado y aleatoriedad
 * ============================================================================
 * Funciones puras (sin estado ni efectos): fáciles de testear y de reutilizar
 * tanto en la UI como en la generación de la lista de la compra (SOLID - S/D).
 */
import type { IngredienteReceta, ItemDespensa, Receta } from '../domain/tipos';
import { aUnidadBase } from '../domain/unidades';

/**
 * Escala los ingredientes de una receta a un número de raciones objetivo.
 * Ej.: receta para 2 → quiero 4 → todas las cantidades × 2.
 */
export function escalarIngredientes(
  receta: Receta,
  racionesObjetivo: number,
): IngredienteReceta[] {
  // El factor se calcula respecto a las raciones base de la receta.
  const factor = racionesObjetivo / receta.raciones;
  return receta.ingredientes.map((ing) => ({
    ...ing,
    // Redondeo a 2 decimales para evitar colas de coma flotante (0.30000004).
    cantidad: Math.round(ing.cantidad * factor * 100) / 100,
  }));
}

/** Criterios de filtrado de la vista principal (todos opcionales). */
export interface FiltrosReceta {
  texto?: string;
  soloFavoritas?: boolean;
  /** Solo recetas cuyos ingredientes INDISPENSABLES están en la despensa. */
  conLoQueTengo?: boolean;
  etiqueta?: string;
  tiempoMaxMin?: number;
}

/**
 * Comprueba si los ingredientes indispensables de una receta están cubiertos
 * por el stock actual. Recibe el stock ya indexado (Map) para que filtrar
 * N recetas sea O(N × I) y no O(N × I × P).
 */
export function esCocinableConDespensa(
  receta: Receta,
  stockPorIngrediente: Map<string, number>,
): boolean {
  return receta.ingredientes
    .filter((ing) => ing.indispensable)
    .every((ing) => {
      const necesario = aUnidadBase(ing.cantidad, ing.unidad).cantidad;
      return (stockPorIngrediente.get(ing.ingredienteId) ?? 0) >= necesario;
    });
}

/** Indexa la despensa por ingrediente para consultas O(1). */
export function indexarStock(despensa: ItemDespensa[]): Map<string, number> {
  return new Map(despensa.map((item) => [item.ingredienteId, item.cantidad]));
}

/** Aplica todos los filtros activos sobre la colección de recetas. */
export function filtrarRecetas(
  recetas: Receta[],
  filtros: FiltrosReceta,
  despensa: ItemDespensa[],
): Receta[] {
  const stock = indexarStock(despensa);
  const texto = filtros.texto?.trim().toLocaleLowerCase('es');

  return recetas.filter((receta) => {
    if (filtros.soloFavoritas && !receta.favorita) return false;
    if (filtros.etiqueta && !receta.etiquetas.includes(filtros.etiqueta)) return false;
    if (filtros.tiempoMaxMin && receta.tiempoMin > filtros.tiempoMaxMin) return false;
    if (filtros.conLoQueTengo && !esCocinableConDespensa(receta, stock)) return false;
    if (texto && !receta.titulo.toLocaleLowerCase('es').includes(texto)) return false;
    return true;
  });
}

/**
 * "Reproducción aleatoria": devuelve una receta al azar distinta de la
 * actual (si es posible), para inspirarse sin decidir.
 */
export function recetaAleatoria(recetas: Receta[], excluirId?: string): Receta | undefined {
  const candidatas = recetas.filter((r) => r.id !== excluirId);
  const bolsa = candidatas.length > 0 ? candidatas : recetas;
  if (bolsa.length === 0) return undefined;
  return bolsa[Math.floor(Math.random() * bolsa.length)];
}
