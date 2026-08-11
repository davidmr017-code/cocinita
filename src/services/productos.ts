/**
 * ============================================================================
 * SERVICIO DE PRODUCTOS — Open Food Facts + catálogo local
 * ============================================================================
 */
import type { Ingrediente, ProductoEscaneado, UnidadBase } from '../domain/tipos';
import {
  inferirCategoria,
  inferirUnidadEmpaque,
  type MetadatosOFF,
} from './categoriasProducto';

const USER_AGENT = 'Cocinita/1.0 (https://github.com/cocinita; pantry-recipe-app)';

/** Proxy same-origin: Vite en local, Vercel en producción (evita CORS). */
const BASE_API = '/api/openfoodfacts';

interface RespuestaOFF {
  status: number;
  product?: {
    product_name?: string;
    product_name_es?: string;
    generic_name?: string;
    generic_name_es?: string;
    brands?: string;
    ingredients_text_es?: string;
    ingredients_text?: string;
    image_front_small_url?: string;
    image_front_url?: string;
    categories?: string;
    categories_tags?: string[];
    pnns_groups_1?: string;
    pnns_groups_2?: string;
    quantity?: string;
    product_quantity?: number | string;
    product_quantity_unit?: string;
  };
}

export function normalizarCodigoBarras(codigo: string): string {
  const digitos = codigo.replace(/\D/g, '');
  if (digitos.length === 12) return `0${digitos}`;
  return digitos;
}

function codigosEquivalentes(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length === 13 && a.startsWith('0') && a.slice(1) === b) return true;
  if (b.length === 13 && b.startsWith('0') && b.slice(1) === a) return true;
  return false;
}

/** Busca en el catálogo local un producto ya registrado con ese código. */
export function buscarProductoLocal(
  codigo: string,
  catalogo: Ingrediente[],
): ProductoEscaneado | null {
  const normalizado = normalizarCodigoBarras(codigo.trim());
  if (!normalizado) return null;

  const ficha = catalogo.find((i) =>
    codigosEquivalentes(normalizarCodigoBarras(i.codigoBarras ?? ''), normalizado),
  );
  if (!ficha) return null;

  return {
    codigo: normalizado,
    nombre: ficha.nombre,
    marca: ficha.marca,
    supermercado: ficha.supermercado,
    imagen: ficha.imagen,
    categoria: ficha.categoria,
    unidadBase: ficha.unidadBase,
    cantidadEmpaque: ficha.cantidadEmpaque && ficha.cantidadEmpaque > 0 ? ficha.cantidadEmpaque : 1,
    origenLocal: true,
  };
}

/** Producto mínimo cuando no hay ficha OFF (alta manual desde escáner). */
export function productoManual(
  codigo: string,
  nombre: string,
  extras?: {
    supermercado?: string;
    unidadBase?: UnidadBase;
    cantidadEmpaque?: number;
    marca?: string;
    categoria?: ProductoEscaneado['categoria'];
  },
): ProductoEscaneado {
  return {
    codigo: normalizarCodigoBarras(codigo) || codigo,
    nombre: nombre.trim() || `Producto ${codigo}`,
    supermercado: extras?.supermercado?.trim() || undefined,
    marca: extras?.marca?.trim() || undefined,
    categoria: extras?.categoria ?? 'otros',
    unidadBase: extras?.unidadBase ?? 'ud',
    cantidadEmpaque: extras?.cantidadEmpaque && extras.cantidadEmpaque > 0 ? extras.cantidadEmpaque : 1,
  };
}

function esAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.message.toLowerCase().includes('abort'))
  );
}

function mapearProductoOFF(codigo: string, p: NonNullable<RespuestaOFF['product']>): ProductoEscaneado {
  const nombre =
    p.product_name_es ||
    p.product_name ||
    p.generic_name_es ||
    p.generic_name ||
    `Producto ${codigo}`;

  const metadatos: MetadatosOFF = {
    categories: p.categories,
    categoriesTags: p.categories_tags,
    pnnsGroup1: p.pnns_groups_1,
    pnnsGroup2: p.pnns_groups_2,
    quantity: p.quantity,
    productQuantity:
      typeof p.product_quantity === 'string'
        ? parseFloat(p.product_quantity)
        : p.product_quantity,
    productQuantityUnit: p.product_quantity_unit,
    nombre,
  };

  const categoria = inferirCategoria(metadatos);
  const empaque = inferirUnidadEmpaque(metadatos);

  return {
    codigo,
    nombre,
    marca: p.brands?.split(',')[0]?.trim(),
    ingredientesTexto: p.ingredients_text_es || p.ingredients_text,
    imagen: p.image_front_small_url || p.image_front_url,
    categoria,
    unidadBase: empaque.unidadBase,
    cantidadEmpaque: empaque.cantidad,
  };
}

async function consultarOFF(codigo: string, version: 'v2' | 'v0'): Promise<ProductoEscaneado | null> {
  const url = `${BASE_API}/api/${version}/product/${encodeURIComponent(codigo)}.json`;

  const respuesta = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    cache: 'no-store',
  });

  if (respuesta.status === 404) return null;
  if (!respuesta.ok) {
    throw new Error(`Open Food Facts respondió ${respuesta.status}`);
  }

  const datos = (await respuesta.json()) as RespuestaOFF;
  if (datos.status !== 1 || !datos.product) return null;

  return mapearProductoOFF(codigo, datos.product);
}

async function buscarVariantes(codigo: string, version: 'v2' | 'v0'): Promise<ProductoEscaneado | null> {
  const resultado = await consultarOFF(codigo, version);
  if (resultado) return resultado;

  if (codigo.startsWith('0') && codigo.length === 13) {
    return consultarOFF(codigo.slice(1), version);
  }
  return null;
}

export async function buscarProductoPorCodigo(codigo: string): Promise<ProductoEscaneado | null> {
  const normalizado = normalizarCodigoBarras(codigo.trim());
  if (!normalizado) throw new Error('Código de barras vacío');

  let ultimoError: unknown;

  for (let intento = 0; intento < 2; intento++) {
    if (intento > 0) {
      await new Promise((r) => setTimeout(r, 800));
    }

    for (const version of ['v2', 'v0'] as const) {
      try {
        const resultado = await buscarVariantes(normalizado, version);
        if (resultado) return resultado;
      } catch (err) {
        if (esAbortError(err)) {
          ultimoError = err;
          continue;
        }
        ultimoError = err;
        console.warn(`[Open Food Facts ${version}]`, err);
      }
    }
  }

  if (ultimoError && !esAbortError(ultimoError)) throw ultimoError;
  if (ultimoError) {
    throw new Error('CONEXION_INTERRUMPIDA');
  }
  return null;
}

export function mensajeErrorProducto(error: unknown): string {
  if (error instanceof Error && error.message === 'CONEXION_INTERRUMPIDA') {
    return 'La consulta se interrumpió. Mantén la app abierta, comprueba internet e inténtalo de nuevo.';
  }
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'La consulta tardó demasiado. Comprueba la conexión a internet e inténtalo de nuevo.';
  }
  if (esAbortError(error)) {
    return 'La consulta se canceló antes de terminar. Inténtalo otra vez sin mover la app.';
  }
  if (error instanceof TypeError && /fetch|network|failed/i.test(error.message)) {
    return 'Sin conexión con Open Food Facts. Comprueba que el móvil tiene internet (WiFi o datos).';
  }
  if (error instanceof Error) {
    return `Error al consultar la base de datos: ${error.message}`;
  }
  return 'No se pudo consultar la base de datos de productos.';
}

/** Stock a sumar = nº de envases escaneados × cantidad neta del envase. */
export function calcularStockEscaneado(
  producto: ProductoEscaneado,
  unidadesEscaneadas: number,
): number {
  return unidadesEscaneadas * producto.cantidadEmpaque;
}

/** Etiqueta de categoría exportada para la UI. */
export { ETIQUETA_CATEGORIA } from './categoriasProducto';
