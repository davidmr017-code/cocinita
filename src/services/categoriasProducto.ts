/**
 * ============================================================================
 * CATEGORIZACIÓN DE PRODUCTOS ESCANEADOS
 * ============================================================================
 * Traduce las etiquetas de Open Food Facts (categories_tags, pnns_groups…)
 * a las categorías de la despensa de Cocinita y deduce la unidad de stock.
 */
import type { CategoriaIngrediente, UnidadBase } from '../domain/tipos';
import { normalizar } from '../domain/utilidades';

/** Datos crudos de categorización que vienen de Open Food Facts. */
export interface MetadatosOFF {
  categories?: string;
  categoriesTags?: string[];
  pnnsGroup1?: string;
  pnnsGroup2?: string;
  quantity?: string;
  productQuantity?: number;
  productQuantityUnit?: string;
  nombre?: string;
}

/** Reglas ordenadas: la primera coincidencia gana (de más específica a general). */
const REGLAS_CATEGORIA: { patron: RegExp; categoria: CategoriaIngrediente }[] = [
  // Lácteos y nevera
  { patron: /dairy|milk|cheese|yogurt|yoghurt|butter|cream|lacteo|leche|queso|yogur|nata/i, categoria: 'lacteos' },

  // Proteínas
  { patron: /meat|meats|fish|seafood|poultry|chicken|beef|pork|ham|egg|huevo|carne|pescado|pollo|atun|salmon|jamón|embutido|protein/i, categoria: 'proteinas' },

  // Frutas
  { patron: /fruit|fruits|berry|berries|apple|banana|orange|citric|fruta|manzana|platano|limon|naranja|fresa|uva/i, categoria: 'frutas' },

  // Verduras y hortalizas
  { patron: /vegetable|vegetables|legume|tomato|onion|garlic|potato|salad|leafy|verdura|hortaliza|tomate|cebolla|ajo|patata|lechuga|espinaca|pimiento|zanahoria|champignon|seta/i, categoria: 'verduras' },

  // Granos, pasta, pan, arroz
  { patron: /cereal|pasta|noodle|rice|bread|flour|grain|biscuit|cookie|arroz|pasta|pan|harina|legumbre|lenteja|garbanzo|avena|trigo/i, categoria: 'granos' },

  // Condimentos, aceites, especias, salsas
  { patron: /sauce|condiment|spice|herb|oil|vinegar|salt|sugar|honey|jam|seasoning|aceite|vinagre|sal\b|azucar|especia|salsa|miel|condimento|pimenton|oregano/i, categoria: 'condimentos' },
];

/** Infiere la categoría de despensa a partir de los metadatos OFF y el nombre. */
export function inferirCategoria(metadatos: MetadatosOFF): CategoriaIngrediente {
  const texto = [
    metadatos.pnnsGroup1,
    metadatos.pnnsGroup2,
    metadatos.categories,
    ...(metadatos.categoriesTags ?? []).map((t) => t.replace(/^en:/, '').replace(/-/g, ' ')),
    metadatos.nombre,
  ]
    .filter(Boolean)
    .join(' ');

  const normalizado = normalizar(texto);

  for (const { patron, categoria } of REGLAS_CATEGORIA) {
    if (patron.test(normalizado)) return categoria;
  }

  return 'otros';
}

/** Convierte la cantidad del envase OFF a la unidad base del inventario. */
export interface CantidadEmpaque {
  cantidad: number;
  unidadBase: UnidadBase;
}

/** Parsea "500 g", "1 L", "6 x 125 g"… */
export function inferirUnidadEmpaque(metadatos: MetadatosOFF): CantidadEmpaque {
  // Campos numéricos estructurados de OFF (más fiables).
  if (metadatos.productQuantity && metadatos.productQuantityUnit) {
    const conv = convertirAUnidadBase(metadatos.productQuantity, metadatos.productQuantityUnit);
    if (conv) return conv;
  }

  if (metadatos.quantity) {
    const conv = parsearTextoCantidad(metadatos.quantity);
    if (conv) return conv;
  }

  // Por defecto: 1 unidad del producto escaneado.
  return { cantidad: 1, unidadBase: 'ud' };
}

function convertirAUnidadBase(valor: number, unidad: string): CantidadEmpaque | null {
  const u = unidad.toLowerCase().trim();
  if (u === 'g' || u === 'gr' || u === 'gram' || u === 'grams') return { cantidad: valor, unidadBase: 'g' };
  if (u === 'kg') return { cantidad: valor * 1000, unidadBase: 'g' };
  if (u === 'ml' || u === 'milliliter') return { cantidad: valor, unidadBase: 'ml' };
  if (u === 'cl') return { cantidad: valor * 10, unidadBase: 'ml' };
  if (u === 'l' || u === 'litre' || u === 'liter') return { cantidad: valor * 1000, unidadBase: 'ml' };
  if (u === 'ud' || u === 'unit' || u === 'units') return { cantidad: valor, unidadBase: 'ud' };
  return null;
}

function parsearTextoCantidad(texto: string): CantidadEmpaque | null {
  // "6 x 125 g" → 750 g
  const multipack = texto.match(/(\d+)\s*x\s*([\d.,]+)\s*(g|kg|ml|cl|l|ud)\b/i);
  if (multipack) {
    const unidades = parseFloat(multipack[1]);
    const valor = parseFloat(multipack[2].replace(',', '.'));
    const conv = convertirAUnidadBase(valor, multipack[3]);
    if (conv) return { cantidad: unidades * conv.cantidad, unidadBase: conv.unidadBase };
  }

  const simple = texto.match(/([\d.,]+)\s*(g|kg|ml|cl|l|ud)\b/i);
  if (simple) {
    const valor = parseFloat(simple[1].replace(',', '.'));
    return convertirAUnidadBase(valor, simple[2]);
  }

  return null;
}

/** Etiqueta legible de la categoría (para mostrar en UI del escáner). */
export const ETIQUETA_CATEGORIA: Record<CategoriaIngrediente, string> = {
  verduras: 'Verduras',
  frutas: 'Frutas',
  lacteos: 'Lácteos y nevera',
  proteinas: 'Proteínas',
  granos: 'Granos y pasta',
  condimentos: 'Condimentos',
  otros: 'Otros',
};
