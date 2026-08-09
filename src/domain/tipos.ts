/**
 * ============================================================================
 * MODELOS DE DOMINIO — Cocinita
 * ============================================================================
 * Esquema de datos "relacional en memoria": cada entidad tiene un `id` y las
 * relaciones se expresan por referencia (ingredienteId, recetaId...), lo que
 * permite migrar tal cual a SQLite (Capacitor) o a Postgres (Supabase).
 *
 * Principio aplicado (SOLID - S): cada interfaz modela UNA sola cosa.
 */

/** Unidades admitidas al escribir recetas o comprar. */
export type Unidad = 'g' | 'kg' | 'ml' | 'l' | 'ud' | 'cda' | 'cdta';

/** Unidad canónica en la que se almacena el stock de cada ingrediente. */
export type UnidadBase = 'g' | 'ml' | 'ud';

/** Categorías para agrupar la despensa y la lista de la compra. */
export type CategoriaIngrediente =
  | 'verduras'
  | 'frutas'
  | 'lacteos'
  | 'proteinas'
  | 'granos'
  | 'condimentos'
  | 'otros';

/**
 * Catálogo maestro de ingredientes.
 * Es la tabla "pivote" que conecta recetas ⇆ despensa ⇆ lista de la compra:
 * las tres hablan siempre en términos de `ingredienteId` + unidad base,
 * lo que hace el cruce de datos O(1) por ingrediente (vía Map).
 */
export interface Ingrediente {
  id: string;
  nombre: string;
  categoria: CategoriaIngrediente;
  /** Unidad canónica del stock ('g' | 'ml' | 'ud'). */
  unidadBase: UnidadBase;
  imagen?: string;
}

/** Línea de ingrediente dentro de una receta (cantidad para `raciones` base). */
export interface IngredienteReceta {
  ingredienteId: string;
  cantidad: number;
  unidad: Unidad;
  /** Marcado como imprescindible: sin él la receta no se puede hacer. */
  indispensable: boolean;
  nota?: string;
}

/** Paso de elaboración con título corto y descripción detallada. */
export interface PasoReceta {
  titulo: string;
  descripcion: string;
}

export type Dificultad = 'facil' | 'media' | 'dificil';

/** Origen de la receta: creada por mí, recibida de un amigo o descubierta. */
export type OrigenReceta = 'propia' | 'amigo' | 'descubierta';

export interface Receta {
  id: string;
  titulo: string;
  descripcion: string;
  imagen?: string;
  /** Vídeo de animación / demostración de la receta (mp4 o embed). */
  videoUrl?: string;
  /** Enlace a la publicación original (Instagram, TikTok, Facebook…). */
  origenUrl?: string;
  /** Raciones para las que están calculadas las cantidades. */
  raciones: number;
  tiempoMin: number;
  dificultad: Dificultad;
  /** Etiquetas libres: 'vegano', 'sin gluten', 'rápido'... */
  etiquetas: string[];
  ingredientes: IngredienteReceta[];
  pasos: PasoReceta[];
  favorita: boolean;
  origen: OrigenReceta;
  /** Nombre del autor si la receta viene de un amigo. */
  autor?: string;
  /** false = guardada "por aprender" (aún no la hemos cocinado nunca). */
  aprendida: boolean;
  creadaEn: string; // ISO date
}

/**
 * Inventario de casa (despensa + nevera).
 * La cantidad se guarda SIEMPRE en la unidad base del ingrediente.
 */
export interface ItemDespensa {
  ingredienteId: string;
  cantidad: number;
  /** Umbral por debajo del cual se considera "queda poco". */
  stockMinimo: number;
  /** Fecha de caducidad YYYY-MM-DD (opcional). */
  caducidad?: string;
}

/** Motivo de un cambio de stock: sirve como historial y auditoría. */
export type TipoMovimiento = 'compra' | 'consumo' | 'cocinado' | 'ajuste';

/**
 * Movimiento de stock (libro diario del inventario).
 * Responde a "¿qué hemos comprado?" (tipo 'compra') y
 * "¿qué se ha consumido/agotado?" (tipos 'consumo' y 'cocinado').
 */
export interface MovimientoStock {
  id: string;
  ingredienteId: string;
  /** Positivo = entra en casa; negativo = sale/se consume. */
  delta: number;
  tipo: TipoMovimiento;
  fecha: string; // ISO datetime
  nota?: string;
}

/** Línea de la lista de la compra dinámica. */
export interface ItemListaCompra {
  id: string;
  /** Puede no existir en el catálogo si es un apunte manual ("bolsas basura"). */
  ingredienteId?: string;
  nombre: string;
  cantidad: number;
  unidad: Unidad;
  /** Recetas que originaron esta necesidad (trazabilidad en la UI). */
  recetaIds: string[];
  comprado: boolean;
  manual: boolean;
}

export type TipoComida = 'comida' | 'cena';

/** Celda del planificador semanal: una receta en un día/comida concretos. */
export interface EntradaMenu {
  id: string;
  /** Fecha del día en formato YYYY-MM-DD. */
  fecha: string;
  comida: TipoComida;
  recetaId: string;
  /** Raciones que se cocinarán ese día (para escalar la lista global). */
  raciones: number;
}

/* ------------------------------- Social ---------------------------------- */

export interface Amigo {
  id: string;
  nombre: string;
  avatar: string;
}

/** Publicación del feed: un amigo ha cocinado algo (motivación social). */
export interface PublicacionFeed {
  id: string;
  amigoId: string;
  recetaTitulo: string;
  imagen: string;
  texto: string;
  fecha: string;
  meGusta: boolean;
  likes: number;
}

/** Petición de receta a un amigo ("pásame tu receta de..."). */
export interface SolicitudReceta {
  id: string;
  amigoId: string;
  mensaje: string;
  estado: 'pendiente' | 'recibida';
  fecha: string;
  /** Cuando el amigo responde, la receta compartida se enlaza aquí. */
  recetaId?: string;
}

/** Resultado de escanear un código de barras (Open Food Facts). */
export interface ProductoEscaneado {
  codigo: string;
  nombre: string;
  marca?: string;
  /** Lista de ingredientes declarada del producto envasado. */
  ingredientesTexto?: string;
  imagen?: string;
  /** Categoría inferida para la despensa (verduras, lácteos, granos…). */
  categoria: CategoriaIngrediente;
  /** Unidad base del stock (g, ml o ud). */
  unidadBase: UnidadBase;
  /** Cantidad neta del envase en unidad base (p. ej. 500 g, 1000 ml). */
  cantidadEmpaque: number;
}

/* ------------------------------- Perfil ---------------------------------- */

/** Alérgenos frecuentes (UE) usados en el perfil familiar. */
export type AlergenoId =
  | 'gluten'
  | 'lactosa'
  | 'huevo'
  | 'frutos_secos'
  | 'cacahuete'
  | 'soja'
  | 'pescado'
  | 'marisco'
  | 'sesamo'
  | 'mostaza'
  | 'apio'
  | 'sulfitos';

/** Preferencias / dietas del hogar o de un miembro. */
export type PreferenciaDieta =
  | 'vegetariano'
  | 'vegano'
  | 'sin_cerdo'
  | 'poco_picante'
  | 'bajo_en_sal'
  | 'alto_proteina'
  | 'casero'
  | 'rapido';

/** Persona del hogar (tú, pareja, hijos…) con alérgenos y gustos. */
export interface MiembroHogar {
  id: string;
  nombre: string;
  /** Color/emoji distintivo opcional (iniciales se derivan del nombre). */
  color?: string;
  alergenos: AlergenoId[];
  preferencias: PreferenciaDieta[];
  /** Alimentos que evita (texto libre: "champiñones", "cilantro"…). */
  evitados: string[];
  /** Notas libres (intolerancias leves, raciones, etc.). */
  notas?: string;
}

/** Perfil del hogar: nombre + miembros de la familia. */
export interface PerfilHogar {
  nombreHogar: string;
  miembros: MiembroHogar[];
}
