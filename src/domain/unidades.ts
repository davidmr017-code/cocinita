/**
 * ============================================================================
 * SISTEMA DE UNIDADES
 * ============================================================================
 * Todas las cantidades se normalizan a la "unidad base" del ingrediente
 * ('g', 'ml' o 'ud') antes de comparar recetas contra despensa.
 * Así el cruce de datos nunca compara peras ('kg') con manzanas ('cda').
 *
 * Principio aplicado (SOLID - O): para añadir una unidad nueva basta con
 * ampliar la tabla FACTORES, sin tocar la lógica de negocio.
 */
import type { Unidad, UnidadBase } from './tipos';

/** Conversión de cada unidad de entrada a su unidad base y factor. */
const FACTORES: Record<Unidad, { base: UnidadBase; factor: number }> = {
  g: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  l: { base: 'ml', factor: 1000 },
  cda: { base: 'ml', factor: 15 }, // cucharada ≈ 15 ml
  cdta: { base: 'ml', factor: 5 }, // cucharadita ≈ 5 ml
  ud: { base: 'ud', factor: 1 },
};

/** Convierte una cantidad a la unidad base de su familia. */
export function aUnidadBase(cantidad: number, unidad: Unidad): { cantidad: number; base: UnidadBase } {
  const { base, factor } = FACTORES[unidad];
  return { cantidad: cantidad * factor, base };
}

/** Unidad base a la que pertenece una unidad de entrada. */
export function baseDe(unidad: Unidad): UnidadBase {
  return FACTORES[unidad].base;
}

const formateador = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

/**
 * Formatea una cantidad (ya en unidad base) de forma legible:
 * 1500 g → "1,5 kg" · 250 ml → "250 ml" · 3 ud → "3 ud".
 */
export function formatearCantidad(cantidadBase: number, base: UnidadBase): string {
  if (base === 'g' && cantidadBase >= 1000) return `${formateador.format(cantidadBase / 1000)} kg`;
  if (base === 'ml' && cantidadBase >= 1000) return `${formateador.format(cantidadBase / 1000)} l`;
  return `${formateador.format(cantidadBase)} ${base}`;
}

/** Paso razonable para los botones +/- según la unidad base. */
export function pasoRapido(base: UnidadBase): number {
  if (base === 'g') return 100;
  if (base === 'ml') return 100;
  return 1;
}
