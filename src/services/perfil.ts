/**
 * Perfil familiar: catálogos de alérgenos/preferencias y cruce con recetas.
 */
import type {
  AlergenoId,
  Ingrediente,
  MiembroHogar,
  PreferenciaDieta,
  Receta,
} from '../domain/tipos';
import { normalizar } from '../domain/utilidades';

export const ALERGENOS: { id: AlergenoId; etiqueta: string; icono: string }[] = [
  { id: 'gluten', etiqueta: 'Gluten', icono: 'bakery_dining' },
  { id: 'lactosa', etiqueta: 'Lácteos / lactosa', icono: 'water_drop' },
  { id: 'huevo', etiqueta: 'Huevo', icono: 'egg' },
  { id: 'frutos_secos', etiqueta: 'Frutos secos', icono: 'nutrition' },
  { id: 'cacahuete', etiqueta: 'Cacahuete', icono: 'spa' },
  { id: 'soja', etiqueta: 'Soja', icono: 'grass' },
  { id: 'pescado', etiqueta: 'Pescado', icono: 'set_meal' },
  { id: 'marisco', etiqueta: 'Marisco', icono: 'skillet' },
  { id: 'sesamo', etiqueta: 'Sésamo', icono: 'grain' },
  { id: 'mostaza', etiqueta: 'Mostaza', icono: 'restaurant' },
  { id: 'apio', etiqueta: 'Apio', icono: 'eco' },
  { id: 'sulfitos', etiqueta: 'Sulfitos', icono: 'science' },
];

export const PREFERENCIAS: { id: PreferenciaDieta; etiqueta: string }[] = [
  { id: 'vegetariano', etiqueta: 'Vegetariano' },
  { id: 'vegano', etiqueta: 'Vegano' },
  { id: 'sin_cerdo', etiqueta: 'Sin cerdo' },
  { id: 'poco_picante', etiqueta: 'Poco picante' },
  { id: 'bajo_en_sal', etiqueta: 'Bajo en sal' },
  { id: 'alto_proteina', etiqueta: 'Alto en proteína' },
  { id: 'casero', etiqueta: 'Cocina casera' },
  { id: 'rapido', etiqueta: 'Comidas rápidas' },
];

export const ETIQUETA_ALERGENO = Object.fromEntries(
  ALERGENOS.map((a) => [a.id, a.etiqueta]),
) as Record<AlergenoId, string>;

export const ETIQUETA_PREFERENCIA = Object.fromEntries(
  PREFERENCIAS.map((p) => [p.id, p.etiqueta]),
) as Record<PreferenciaDieta, string>;

/** Palabras clave en nombres de ingredientes que disparan cada alérgeno. */
const CLAVES_ALERGENO: Record<AlergenoId, string[]> = {
  gluten: ['harina', 'trigo', 'pasta', 'pan', 'espagueti', 'macarron', 'gallet', 'sémola', 'cebada', 'centeno', 'couscous', 'gluten'],
  lactosa: ['leche', 'queso', 'yogur', 'nata', 'mantequilla', 'crema', 'lacteo', 'parmesano', 'mozzarella', 'ricotta'],
  huevo: ['huevo', 'yema', 'clara'],
  frutos_secos: ['almendra', 'nuez', 'nueces', 'avellana', 'pistacho', 'anacardo', 'nuez de'],
  cacahuete: ['cacahuete', 'mani', 'maní', 'peanut'],
  soja: ['soja', 'tofu', 'edamame', 'miso'],
  pescado: ['pescado', 'salmon', 'salmón', 'atun', 'atún', 'bacalao', 'merluza', 'anchoa'],
  marisco: ['gamba', 'langostino', 'mejillón', 'mejillon', 'calamar', 'pulpo', 'marisco', 'gambas'],
  sesamo: ['sesamo', 'sésamo', 'tahini'],
  mostaza: ['mostaza'],
  apio: ['apio'],
  sulfitos: ['vino', 'vinagre balsamico', 'sulfito'],
};

/** Etiquetas de receta que indican que ese alérgeno NO está presente. */
const ETIQUETA_SEGURA: Partial<Record<AlergenoId, string[]>> = {
  gluten: ['sin gluten', 'gluten free', 'celiaco', 'celíaco'],
  lactosa: ['sin lactosa', 'lactose free', 'dairy free'],
};

export interface ConflictoAlergeno {
  miembroId: string;
  miembroNombre: string;
  alergeno: AlergenoId;
  motivo: string;
}

export interface ConflictoEvitado {
  miembroId: string;
  miembroNombre: string;
  evitado: string;
  ingrediente: string;
}

export interface AvisosReceta {
  alergenos: ConflictoAlergeno[];
  evitados: ConflictoEvitado[];
}

function recetaMarcadaSegura(receta: Receta, alergeno: AlergenoId): boolean {
  const tags = receta.etiquetas.map(normalizar);
  const seguras = (ETIQUETA_SEGURA[alergeno] ?? []).map(normalizar);
  return seguras.some((s) => tags.some((t) => t.includes(s)));
}

function ingredientesTocanAlergeno(
  nombres: string[],
  alergeno: AlergenoId,
): string | null {
  const claves = CLAVES_ALERGENO[alergeno].map(normalizar);
  for (const nombre of nombres) {
    const n = normalizar(nombre);
    if (claves.some((c) => n.includes(c))) return nombre;
  }
  return null;
}

/**
 * Cruza una receta con los miembros del hogar y devuelve conflictos
 * de alérgenos y alimentos evitados.
 */
export function avisosParaReceta(
  receta: Receta,
  catalogo: Ingrediente[],
  miembros: MiembroHogar[],
): AvisosReceta {
  const porId = new Map(catalogo.map((i) => [i.id, i.nombre]));
  const nombres = receta.ingredientes.map(
    (ing) => porId.get(ing.ingredienteId) ?? ing.ingredienteId,
  );

  const alergenos: ConflictoAlergeno[] = [];
  const evitados: ConflictoEvitado[] = [];

  for (const miembro of miembros) {
    for (const alergeno of miembro.alergenos) {
      if (recetaMarcadaSegura(receta, alergeno)) continue;
      const tocado = ingredientesTocanAlergeno(nombres, alergeno);
      if (tocado) {
        alergenos.push({
          miembroId: miembro.id,
          miembroNombre: miembro.nombre,
          alergeno,
          motivo: tocado,
        });
      }
    }

    for (const evitado of miembro.evitados) {
      const clave = normalizar(evitado);
      if (!clave) continue;
      const match = nombres.find((n) => normalizar(n).includes(clave));
      if (match) {
        evitados.push({
          miembroId: miembro.id,
          miembroNombre: miembro.nombre,
          evitado,
          ingrediente: match,
        });
      }
    }
  }

  return { alergenos, evitados };
}

/** Iniciales de un nombre para el avatar (máx. 2 letras). */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

export const COLORES_MIEMBRO = [
  '#3f5c3e',
  '#a85f3d',
  '#5b7c99',
  '#8b6b9e',
  '#c4a35a',
  '#6b8f71',
];
