/**
 * ============================================================================
 * CATEGORIZACIÓN DE PRODUCTOS ESCANEADOS
 * ============================================================================
 * Traduce las etiquetas de Open Food Facts (categories_tags, pnns_groups…)
 * a las categorías de la despensa de Cocinita y deduce la unidad de stock.
 */
import type { CategoriaIngrediente, Ingrediente, UnidadBase } from '../domain/tipos';
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
  // Condimentos, aceites, especias, salsas (antes que proteínas: "salsa de atún" es salsa)
  {
    patron:
      /sauce|condiment|spice|herb|oil|vinegar|salt|sugar|honey|jam|seasoning|mayonnaise|ketchup|mustard|aceite|vinagre|\bsal\b|azucar|especia|salsa|miel|mermelada|condimento|pimenton|oregano|comino|curry|canela|vainilla|mayonesa|ketchup|mostaza|caldo|sofrito|tomate frito|levadura|bicarbonato|sazonador|adobo|alino|perejil seco|ajo en polvo/i,
    categoria: 'condimentos',
  },

  // Lácteos y nevera
  {
    patron:
      /dairy|milk|cheese|yogurt|yoghurt|butter|cream|kefir|lacteo|leche|queso|yogur|natilla|nata|mantequilla|margarina|cuajada|requeson|batido de leche|bebida de avena|bebida de soja|bebida de almendra|flan|petit/i,
    categoria: 'lacteos',
  },

  // Proteínas (carnes, pescados, huevos, embutidos, legumbre proteica preparada)
  {
    patron:
      /meat|meats|fish|seafood|poultry|chicken|beef|pork|ham|egg|sausage|bacon|tofu|seitan|huevo|carne|pescado|pollo|pavo|ternera|cerdo|cordero|atun|salmon|merluza|bacalao|sardina|caballa|boqueron|gamba|langostino|mejillon|calamar|pulpo|sepia|jamon|embutido|chorizo|salchichon|salchicha|lomo|fuet|mortadela|pechuga|hamburguesa|albondiga|tofu|seitan|tempeh|protein/i,
    categoria: 'proteinas',
  },

  // Frutas
  {
    patron:
      /fruit|fruits|berry|berries|apple|banana|orange|citric|melon|peach|pear|grape|fruta|manzana|platano|banana|limon|lima|naranja|mandarina|fresa|freson|uva|melon|sandia|pera|melocoton|nectarina|albaricoque|ciruela|kiwi|pina|mango|papaya|aguacate|cereza|granada|higo|caqui|arandano|frambuesa|mora\b/i,
    categoria: 'frutas',
  },

  // Verduras y hortalizas
  {
    patron:
      /vegetable|vegetables|tomato|onion|garlic|potato|salad|leafy|zucchini|pepper|carrot|verdura|hortaliza|tomate|cebolla|ajo\b|patata|batata|boniato|lechuga|escarola|canonigo|rucula|espinaca|acelga|pimiento|zanahoria|champinon|champignon|seta|calabacin|calabaza|berenjena|pepino|brocoli|coliflor|col\b|repollo|alcachofa|esparrago|judias verdes|guisante|puerro|apio|remolacha|rabano|nabo|maiz|endivia/i,
    categoria: 'verduras',
  },

  // Granos, pasta, pan, arroz, legumbre seca, frutos secos
  {
    patron:
      /cereal|pasta|noodle|rice|bread|flour|grain|biscuit|cookie|cracker|oat|quinoa|arroz|macarron|espagueti|spaghetti|fideo|noodle|pan\b|pan de|harina|legumbre|lenteja|garbanzo|alubia|judias?\b|frijol|avena|trigo|quinoa|cuscus|couscous|galleta|cereales|tostada|picos|colin|nuez|nueces|almendra|avellana|anacardo|pistacho|cacahuete|semilla|pipas/i,
    categoria: 'granos',
  },
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

/** Categoría sugerida a partir solo del nombre (y marca) de un producto. */
export function sugerirCategoriaPorNombre(nombre: string): CategoriaIngrediente {
  const normalizado = normalizar(nombre);
  for (const { patron, categoria } of REGLAS_CATEGORIA) {
    if (patron.test(normalizado)) return categoria;
  }
  return 'otros';
}

/** Propuesta del reorganizador: mover un producto a otra categoría. */
export interface PropuestaCategoria {
  ingredienteId: string;
  nombre: string;
  categoriaActual: CategoriaIngrediente;
  categoriaPropuesta: CategoriaIngrediente;
}

/**
 * Revisa todo el catálogo y propone recolocar los productos cuya categoría
 * no coincide con la que sugiere el diccionario. Nunca propone mover a
 * 'otros' (solo saca cosas de categorías equivocadas, no las "des-clasifica").
 */
export function reorganizarCategorias(ingredientes: Ingrediente[]): PropuestaCategoria[] {
  const propuestas: PropuestaCategoria[] = [];
  for (const ing of ingredientes) {
    const sugerida = sugerirCategoriaPorNombre(ing.nombre);
    if (sugerida !== 'otros' && sugerida !== ing.categoria) {
      propuestas.push({
        ingredienteId: ing.id,
        nombre: ing.nombre,
        categoriaActual: ing.categoria,
        categoriaPropuesta: sugerida,
      });
    }
  }
  return propuestas;
}
