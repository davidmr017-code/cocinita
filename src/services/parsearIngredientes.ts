/**
 * Parseo de ingredientes escritos a mano (español).
 * Ejemplos: "200 g de tomate", "2 huevos", "1 cda de aceite de oliva", "sal al gusto"
 */
import type { Unidad } from '../domain/tipos';
import { normalizar } from '../domain/utilidades';

export interface IngredienteParseado {
  nombre: string;
  cantidad: number;
  unidad: Unidad;
  /** Línea original, por si hace falta revisar. */
  original: string;
  confianza: 'alta' | 'media' | 'baja';
}

const SINONIMOS_UNIDAD: { patron: RegExp; unidad: Unidad }[] = [
  { patron: /^(kg|kilos?|kilogramos?)$/i, unidad: 'kg' },
  { patron: /^(g|gr|gramos?)$/i, unidad: 'g' },
  { patron: /^(l|litros?)$/i, unidad: 'l' },
  { patron: /^(ml|mililitros?)$/i, unidad: 'ml' },
  { patron: /^(cda|cucharadas?)$/i, unidad: 'cda' },
  { patron: /^(cdta|cucharaditas?)$/i, unidad: 'cdta' },
  { patron: /^(ud|uds|unidades?|unidad)$/i, unidad: 'ud' },
];

const FRACCIONES: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '1/2': 0.5,
  '1/4': 0.25,
  '3/4': 0.75,
  '1/3': 1 / 3,
  '2/3': 2 / 3,
};

function parsearNumero(texto: string): number | null {
  const t = texto.trim().replace(',', '.');
  if (FRACCIONES[t] !== undefined) return FRACCIONES[t];
  // "1 1/2" o "1 ½"
  const mixtas = t.match(/^(\d+)\s+(\d\/\d|½|¼|¾|⅓|⅔)$/);
  if (mixtas) {
    const entero = parseFloat(mixtas[1]);
    const frac = FRACCIONES[mixtas[2]] ?? parseFraccion(mixtas[2]);
    if (frac !== null) return entero + frac;
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function parseFraccion(texto: string): number | null {
  if (FRACCIONES[texto] !== undefined) return FRACCIONES[texto];
  const m = texto.match(/^(\d+)\/(\d+)$/);
  if (!m) return null;
  const a = parseFloat(m[1]);
  const b = parseFloat(m[2]);
  return b !== 0 ? a / b : null;
}

function unidadDe(token: string): Unidad | null {
  const n = normalizar(token).replace(/\./g, '');
  for (const { patron, unidad } of SINONIMOS_UNIDAD) {
    if (patron.test(n)) return unidad;
  }
  return null;
}

function limpiarNombre(nombre: string): string {
  return nombre
    .replace(/^(de|del|la|el|los|las|un|una)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\-–—]\s*/, '')
    .trim();
}

/**
 * Parsea una sola línea de ingrediente.
 * Devuelve null si la línea está vacía o es un encabezado ("Ingredientes:").
 */
export function parsearLineaIngrediente(linea: string): IngredienteParseado | null {
  let texto = linea.trim();
  if (!texto) return null;

  // Viñetas y numeración
  texto = texto.replace(/^[-*•·–—]\s*/, '').replace(/^\d+[\).:\-]\s*/, '').trim();
  if (!texto) return null;

  const lower = normalizar(texto);
  if (/^(ingredientes?|para\s+\d+|raciones?)\b/.test(lower) && !/\d/.test(texto.slice(0, 3))) {
    // Encabezado tipo "Ingredientes" sin cantidad al inicio
    if (/^ingredientes?\s*:?\s*$/.test(lower)) return null;
  }

  // "sal al gusto", "pimienta al gusto"
  if (/\bal gusto\b/i.test(texto) || /\bc\/s\b/i.test(texto)) {
    const nombre = limpiarNombre(texto.replace(/\s*(al gusto|c\/s)\s*/gi, ' '));
    if (!nombre) return null;
    return {
      nombre,
      cantidad: 1,
      unidad: 'ud',
      original: linea.trim(),
      confianza: 'media',
    };
  }

  // Patrón: cantidad [unidad] [de] nombre
  // "200 g de tomate", "2 huevos", "1,5 kg harina", "½ cda aceite"
  const re =
    /^([\d.,]+|\d+\s+\d\/\d|[½¼¾⅓⅔]|\d\/\d)\s*(kg|kilos?|kilogramos?|g|gr|gramos?|ml|mililitros?|l|litros?|cda|cucharadas?|cdta|cucharaditas?|ud|uds|unidades?|unidad)?\.?\s*(?:de\s+|del\s+|d['']\s*)?(.+)$/i;

  const m = texto.match(re);
  if (m) {
    const cantidad = parsearNumero(m[1]);
    if (cantidad === null || cantidad <= 0) return null;
    const unidad = m[2] ? unidadDe(m[2]) ?? 'ud' : 'ud';
    const nombre = limpiarNombre(m[3]);
    if (!nombre) return null;
    return {
      nombre,
      cantidad,
      unidad,
      original: linea.trim(),
      confianza: m[2] ? 'alta' : 'media',
    };
  }

  // Solo nombre sin cantidad → 1 ud
  const nombreSolo = limpiarNombre(texto);
  if (nombreSolo.length < 2) return null;
  return {
    nombre: nombreSolo,
    cantidad: 1,
    unidad: 'ud',
    original: linea.trim(),
    confianza: 'baja',
  };
}

/** Parsea un bloque multilínea (una línea = un ingrediente). */
export function parsearTextoIngredientes(texto: string): IngredienteParseado[] {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const resultado: IngredienteParseado[] = [];
  const vistos = new Set<string>();

  for (const linea of lineas) {
    const p = parsearLineaIngrediente(linea);
    if (!p) continue;
    const clave = normalizar(p.nombre);
    if (vistos.has(clave)) {
      // Misma ingrediente repetido: suma cantidades si misma unidad
      const prev = resultado.find((r) => normalizar(r.nombre) === clave);
      if (prev && prev.unidad === p.unidad) {
        prev.cantidad += p.cantidad;
      }
      continue;
    }
    vistos.add(clave);
    resultado.push(p);
  }

  return resultado;
}
