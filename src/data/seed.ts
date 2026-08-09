/**
 * ============================================================================
 * DATOS SEMILLA — estado inicial de la app en el primer arranque
 * ============================================================================
 * Las imágenes provienen del diseño Stitch (stitch_smart_pantry_recipe_hub)
 * para que la app luzca exactamente como los mockups.
 * Una vez el usuario interactúa, todo se persiste en el almacenamiento local.
 */
import type {
  Amigo,
  EntradaMenu,
  Ingrediente,
  ItemDespensa,
  ItemListaCompra,
  MovimientoStock,
  PerfilHogar,
  PublicacionFeed,
  Receta,
  SolicitudReceta,
} from '../domain/tipos';

/* Base de las imágenes del kit de diseño */
const IMG = 'https://lh3.googleusercontent.com/aida-public';
export const IMAGENES = {
  avatar: `${IMG}/AB6AXuDXp6UZc4GsSSC8iwiVxANK7hwqtGppZCeBaV27RMF7rSZtXTr_L7_K2a1fCicpV80rYWFqxZDfnIfuD3N3hQE2vjDVmqf6C09A6fhUK3Xg1mPez-kZWVLgnND53QRd5Nqp2BtJexiR6keTokrW0jPSwSNVtzixH4zkcdTTRNGgEPE11Xq8h_bFisveLYHMWYA-OkHUbM-zsBcC2vgUcWOWQThzglrjybHs3YqODK8KUg81bj3EpV9M`,
  shakshuka: `${IMG}/AB6AXuCowtkOwDZaICYGgNRj03EkhNmLoYn0GrSazdMgLTg9hv9GKZ3H6VKl_0x-i9bLH9pUudYcQBQ7vMv_qNUV5ietFw21ZEtdiSddiy2FXRjE1-3NOHksMhhY4teNcp0ztjrD1x8u_5Vjs87WMtO9KTUxQzcIGj0JhsfIA1GzqlMvChqbkgkm0LjpJZgcA6SySqbZXGKaNAPH3I10Jmboa7TmPM_lW7l6k1LAT3PyrVcb-Xmbcax25RZu`,
  risotto: `${IMG}/AB6AXuDCNbW_TkTCPWR3ZtJqBI3uHC9h5rC5C2ttmgu_dyYo_rZMKBjpI6-USVgHGQZSJUYfMYEueOEzV88JF3eZdPhvzDZeeOCEv_N1-Vbuq8qaKDuVZF-08IDpywjA8ihPMiJFZQr-Iq5EXzlM2ajrDyCva3f7hNx0qCYjts0Hs4TU_E8S3EA_592TM4c3IokHZa5pRoX9khF7QNMTPk8oVbE2sHXpqpZfpACqhTzllRAFQI8b5MyYuoFY`,
  ensalada: `${IMG}/AB6AXuDiUrXJkAlJYycbCNOyV8OMkNStDuCYk0MpUUqoZG-AgWs2YBJzD7cYzN__x2JOF5J8gUIRcZBieYmas8azlIp_6vNbhAPF52KNk0Eh2y6cJZK0I9A_CYlFzswR-TPmgCsyhO943MmNdOcI7yk2ZSGsIqYdi_I3apmZpROHpbZsF7r05qGggWjCPNtVLSywyMGBkz4DHAs3lHypoNxRRxV-nLCOHZCI5nG1n2Pwz2c0y4GGhR1eAOGv`,
  tarta: `${IMG}/AB6AXuDp7wT_V93SmjIUg5QUULakypd-WxNt0z1nYhlt7rc8HoRGTF-0Q0TY7u8nkKM6arpjyTqwpJN5yStoh7ToHkNwN7SpsDd7P_BRvHA0KRvSQGFkvQ5TByXjDTPgsavF9mK-7Av5LlMZ2tLowIYMPb9Atb_sphZMR7ipfUy_ITysFNw3J7kvxbodYrhViFWvC8NGgHf0iZRNP0lb_BuxshUpUlkZztYWHEtlcQzE8Puauz340jaVl4Hl`,
  pasta: `${IMG}/AB6AXuDY2CvYjsHWuWNHJse3072iCZxQcGUsak3RJKaN48ZlaYLguSI-CV4WWF6F3iSvCvkd1TuqOOW4yJ7eG5wOwxJQ2vRNafdFFd5U7qyVsFfRF1af_liEwlljSH0AgfghiDLFz7kKpOD4wCqHYHLFxcFnaFRBT5NHXMZa9l877y6fzGIdWcFZoVL2pleZCAH1AO9MdqOEuBGCBaW61YMGYTUZdz9yM5pPC4NhC5T3lcJArnmxFYCDNMpu`,
  espinacas: `${IMG}/AB6AXuC3d1eQUpTqZXJ-ZUMPqbitpvkmBqIaPPRS-aJZ1KQwahCssFJNR89IjqqNaoLCpZanQhwNTzJMxM9JHeQFtjRE0bXfoyi1yYdqR1LMdIzvYn1fkJv4EG5JzuLLUQQhMbNWKWXW-jaok-56DiS21zCh24oIouxkErcU6RocETKDYD21TkcnLdpe8bq4_q7MHd2gu_tF6hpzZV1pDzpgKjIugOW-SwQKq61zdrpVkV8R-2xFN6hf8XNt`,
  zanahoria: `${IMG}/AB6AXuBzfgOuL0NYde9dVYQHkBUzJWvtbt67ysnhdh3fUHwybQpu9r8fsFwxcaIAcV2SSLbaaszj-JNVU-i52Q2uhxFBGrb3QlLGqWrF-azSyoW3E1qwnBf9Nn8ja-Xv6VQe-GgX2V1oOUaep2n6roC8e0K9u4PfH8GYCbiMI2uTXuvoPw9DzntkkOekxZBnbmBX7PXJnDnGeMngMrEd666hxYn5e9bVWIM4DDwnTKp3X5U5zBhURpM_TmYf`,
  leche: `${IMG}/AB6AXuBcY5e7mP3vlrvp_E82b8YCuVpS2XlgkhEOiA97-3lORbg7mkCBB4M22El27XWcRnRTJzJ5--MHGrEp4QHzAxk6q3rCG5Sk0ZM3WnW056Gw2p271R1n7VFS6UNIfw1YrH6GCz-OeTpy3-Keajyh8jw9ORs3HRpNsVkLH4DHfNpZCKqAW2nMAEEHTLjZSGalcp4xlCuUmPK0KFh09XRN8FlUiLYAfQmifrW9IBZrSzx-Rn0tITdpRstt`,
  arroz: `${IMG}/AB6AXuDEE07vwV1dpBMp70xrT7XVaXoiMmKaveGpj7aAkBXCrjr0ArtBZ5ECYXfc8fr_R8iW-AC0BvD06PQYwyb7HQA6DdPlt4goZd5p8Lmsx0bCpMcY9PQA7oC7BoUFb-2KKoeQacKKu7UGpjlzFRgbdZPh5BdF_FLqXEBPe__batlsH-RgDhGFunTY8Fb4mcCr8z6jqGXYWvEJQaZH4618bouiXwr_JuAqK8EBcN1iD3dwZrnzC_AnNBBW`,
  estanteria: `${IMG}/AB6AXuBGcF8_FMd_w30UxypQ0c6qV9GH3_RIKaPeMFMdXlZ07T0DSYE8dINebfEDg8hDIbDtu-2_wBjppbFY5J6LARWweKQ9CjTQj0f-m3J2L_1sVZFs8KzsTAK04Pi0gFbKHhGLoF2O8y17Qeq9cp59kuUq1CTP5huha3Tjqfs9oiOB4CqzbJaHianejp60a3YZDH5yf0KO1ZskGEB97xkG9oGTJ1TxuwJVWp3rKuhIWMzIMkn4WXILFmui`,
};

/** Vídeo de animación de demostración (dominio público, solo para la demo). */
const VIDEO_DEMO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

/** Fecha ISO de hace `dias` días (para historial y feed realistas). */
const haceDias = (dias: number): string =>
  new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

/* ----------------------- Catálogo de ingredientes ------------------------ */

export const INGREDIENTES_SEED: Ingrediente[] = [
  { id: 'huevo', nombre: 'Huevos', categoria: 'proteinas', unidadBase: 'ud' },
  { id: 'tomate-triturado', nombre: 'Tomate triturado', categoria: 'verduras', unidadBase: 'g' },
  { id: 'pimiento-rojo', nombre: 'Pimiento rojo', categoria: 'verduras', unidadBase: 'ud' },
  { id: 'cebolla', nombre: 'Cebolla', categoria: 'verduras', unidadBase: 'ud' },
  { id: 'ajo', nombre: 'Ajo (dientes)', categoria: 'verduras', unidadBase: 'ud' },
  { id: 'aceite-oliva', nombre: 'Aceite de oliva', categoria: 'condimentos', unidadBase: 'ml' },
  { id: 'pimenton', nombre: 'Pimentón dulce', categoria: 'condimentos', unidadBase: 'g' },
  { id: 'comino', nombre: 'Comino molido', categoria: 'condimentos', unidadBase: 'g' },
  { id: 'sal', nombre: 'Sal', categoria: 'condimentos', unidadBase: 'g' },
  { id: 'arroz-arborio', nombre: 'Arroz arborio', categoria: 'granos', unidadBase: 'g', imagen: IMAGENES.arroz },
  { id: 'champinones', nombre: 'Champiñones', categoria: 'verduras', unidadBase: 'g' },
  { id: 'caldo-verduras', nombre: 'Caldo de verduras', categoria: 'otros', unidadBase: 'ml' },
  { id: 'vino-blanco', nombre: 'Vino blanco', categoria: 'otros', unidadBase: 'ml' },
  { id: 'parmesano', nombre: 'Queso parmesano', categoria: 'lacteos', unidadBase: 'g' },
  { id: 'mantequilla', nombre: 'Mantequilla', categoria: 'lacteos', unidadBase: 'g' },
  { id: 'espinacas', nombre: 'Espinacas frescas', categoria: 'verduras', unidadBase: 'g', imagen: IMAGENES.espinacas },
  { id: 'zanahoria', nombre: 'Zanahorias', categoria: 'verduras', unidadBase: 'ud', imagen: IMAGENES.zanahoria },
  { id: 'leche-entera', nombre: 'Leche entera', categoria: 'lacteos', unidadBase: 'ml', imagen: IMAGENES.leche },
  { id: 'salmon', nombre: 'Salmón fresco', categoria: 'proteinas', unidadBase: 'g' },
  { id: 'lechuga', nombre: 'Lechuga', categoria: 'verduras', unidadBase: 'ud' },
  { id: 'limon', nombre: 'Limones', categoria: 'frutas', unidadBase: 'ud' },
  { id: 'manzana', nombre: 'Manzanas', categoria: 'frutas', unidadBase: 'ud' },
  { id: 'harina', nombre: 'Harina de trigo', categoria: 'granos', unidadBase: 'g' },
  { id: 'azucar', nombre: 'Azúcar', categoria: 'condimentos', unidadBase: 'g' },
  { id: 'canela', nombre: 'Canela molida', categoria: 'condimentos', unidadBase: 'g' },
  { id: 'espaguetis', nombre: 'Espaguetis', categoria: 'granos', unidadBase: 'g' },
  { id: 'albahaca', nombre: 'Albahaca fresca (manojo)', categoria: 'verduras', unidadBase: 'ud' },
];

/* ------------------------------- Recetas --------------------------------- */

export const RECETAS_SEED: Receta[] = [
  {
    id: 'shakshuka',
    titulo: 'Shakshuka rústica',
    descripcion:
      'Huevos escalfados sobre una salsa especiada de tomate y pimiento. El desayuno-cena definitivo en una sola sartén.',
    imagen: IMAGENES.shakshuka,
    videoUrl: VIDEO_DEMO,
    raciones: 2,
    tiempoMin: 25,
    dificultad: 'facil',
    etiquetas: ['rápido', 'vegetariano', 'sin gluten'],
    ingredientes: [
      { ingredienteId: 'huevo', cantidad: 4, unidad: 'ud', indispensable: true },
      { ingredienteId: 'tomate-triturado', cantidad: 400, unidad: 'g', indispensable: true },
      { ingredienteId: 'pimiento-rojo', cantidad: 1, unidad: 'ud', indispensable: true },
      { ingredienteId: 'cebolla', cantidad: 1, unidad: 'ud', indispensable: false },
      { ingredienteId: 'ajo', cantidad: 2, unidad: 'ud', indispensable: false },
      { ingredienteId: 'aceite-oliva', cantidad: 2, unidad: 'cda', indispensable: false },
      { ingredienteId: 'pimenton', cantidad: 5, unidad: 'g', indispensable: false },
      { ingredienteId: 'comino', cantidad: 3, unidad: 'g', indispensable: false },
    ],
    pasos: [
      { titulo: 'Sofrito base', descripcion: 'Pocha la cebolla, el pimiento y el ajo en aceite de oliva a fuego medio unos 8 minutos, hasta que estén tiernos.' },
      { titulo: 'Salsa especiada', descripcion: 'Añade el pimentón y el comino, remueve 30 segundos y agrega el tomate triturado. Cocina 10 minutos hasta que espese.' },
      { titulo: 'Escalfar los huevos', descripcion: 'Haz huecos en la salsa y casca un huevo en cada uno. Tapa y cocina 5-6 minutos hasta que la clara cuaje.' },
      { titulo: 'Servir', descripcion: 'Sazona, decora con perejil o albahaca y sirve directamente en la sartén con pan para mojar.' },
    ],
    favorita: true,
    origen: 'propia',
    aprendida: true,
    creadaEn: haceDias(40),
  },
  {
    id: 'risotto-champinones',
    titulo: 'Risotto cremoso de champiñones',
    descripcion:
      'Arroz arborio meloso con champiñones salteados, un toque de vino blanco y parmesano. Puro confort.',
    imagen: IMAGENES.risotto,
    videoUrl: VIDEO_DEMO,
    raciones: 4,
    tiempoMin: 45,
    dificultad: 'media',
    etiquetas: ['vegetariano', 'casero'],
    ingredientes: [
      { ingredienteId: 'arroz-arborio', cantidad: 320, unidad: 'g', indispensable: true },
      { ingredienteId: 'champinones', cantidad: 300, unidad: 'g', indispensable: true },
      { ingredienteId: 'caldo-verduras', cantidad: 1, unidad: 'l', indispensable: true },
      { ingredienteId: 'vino-blanco', cantidad: 100, unidad: 'ml', indispensable: false },
      { ingredienteId: 'parmesano', cantidad: 60, unidad: 'g', indispensable: false },
      { ingredienteId: 'mantequilla', cantidad: 40, unidad: 'g', indispensable: false },
      { ingredienteId: 'cebolla', cantidad: 1, unidad: 'ud', indispensable: false },
    ],
    pasos: [
      { titulo: 'Saltear los champiñones', descripcion: 'Saltea los champiñones laminados a fuego fuerte hasta dorarlos. Reserva.' },
      { titulo: 'Nacarar el arroz', descripcion: 'Sofríe la cebolla picada en mantequilla, añade el arroz y remueve 2 minutos hasta que esté translúcido. Desglasa con el vino.' },
      { titulo: 'Cocción por cazos', descripcion: 'Añade el caldo caliente cazo a cazo, removiendo, durante unos 18 minutos. El arroz debe quedar meloso.' },
      { titulo: 'Mantecar', descripcion: 'Fuera del fuego, incorpora los champiñones, la mantequilla restante y el parmesano. Reposa 2 minutos y sirve.' },
    ],
    favorita: false,
    origen: 'descubierta',
    aprendida: false,
    creadaEn: haceDias(12),
  },
  {
    id: 'ensalada-salmon',
    titulo: 'Ensalada cítrica de salmón',
    descripcion:
      'Salmón a la plancha sobre hojas verdes con vinagreta de limón. Ligera, fresca y lista en 20 minutos.',
    imagen: IMAGENES.ensalada,
    raciones: 2,
    tiempoMin: 20,
    dificultad: 'facil',
    etiquetas: ['rápido', 'saludable', 'sin gluten'],
    ingredientes: [
      { ingredienteId: 'salmon', cantidad: 300, unidad: 'g', indispensable: true },
      { ingredienteId: 'lechuga', cantidad: 1, unidad: 'ud', indispensable: true },
      { ingredienteId: 'limon', cantidad: 1, unidad: 'ud', indispensable: true },
      { ingredienteId: 'aceite-oliva', cantidad: 3, unidad: 'cda', indispensable: false },
      { ingredienteId: 'zanahoria', cantidad: 1, unidad: 'ud', indispensable: false },
    ],
    pasos: [
      { titulo: 'Marcar el salmón', descripcion: 'Salpimienta el salmón y márcalo en sartén caliente 3 minutos por cada lado, empezando por la piel.' },
      { titulo: 'Vinagreta cítrica', descripcion: 'Emulsiona el zumo de limón con el aceite de oliva, sal y una pizca de pimienta.' },
      { titulo: 'Montar', descripcion: 'Mezcla las hojas y la zanahoria rallada con la vinagreta, corona con el salmón desmigado y sirve.' },
    ],
    favorita: false,
    origen: 'propia',
    aprendida: true,
    creadaEn: haceDias(30),
  },
  {
    id: 'tarta-manzana',
    titulo: 'Tarta de manzana clásica',
    descripcion:
      'Tarta de manzana con enrejado dorado y aroma de canela, como la de la abuela.',
    imagen: IMAGENES.tarta,
    videoUrl: VIDEO_DEMO,
    raciones: 8,
    tiempoMin: 75,
    dificultad: 'dificil',
    etiquetas: ['postre', 'casero'],
    ingredientes: [
      { ingredienteId: 'manzana', cantidad: 6, unidad: 'ud', indispensable: true },
      { ingredienteId: 'harina', cantidad: 350, unidad: 'g', indispensable: true },
      { ingredienteId: 'mantequilla', cantidad: 200, unidad: 'g', indispensable: true },
      { ingredienteId: 'azucar', cantidad: 150, unidad: 'g', indispensable: true },
      { ingredienteId: 'canela', cantidad: 5, unidad: 'g', indispensable: false },
      { ingredienteId: 'huevo', cantidad: 1, unidad: 'ud', indispensable: false },
    ],
    pasos: [
      { titulo: 'Masa quebrada', descripcion: 'Mezcla harina, mantequilla fría en dados y una pizca de sal hasta obtener migas. Añade agua helada, forma la masa y refrigera 30 minutos.' },
      { titulo: 'Relleno', descripcion: 'Pela y lamina las manzanas; mézclalas con el azúcar y la canela.' },
      { titulo: 'Montaje y enrejado', descripcion: 'Forra el molde con la masa, rellena con la manzana y cubre con tiras entrelazadas. Pinta con huevo batido.' },
      { titulo: 'Horneado', descripcion: 'Hornea a 190 °C durante 45-50 minutos hasta que el enrejado esté dorado. Deja templar antes de cortar.' },
    ],
    favorita: true,
    origen: 'descubierta',
    aprendida: false,
    creadaEn: haceDias(8),
  },
  {
    id: 'pasta-pomodoro',
    titulo: 'Pasta al pomodoro de la nonna',
    descripcion:
      'Espaguetis al dente con salsa de tomate cocinada a fuego lento y albahaca fresca. Receta compartida por Lucía.',
    imagen: IMAGENES.pasta,
    videoUrl: VIDEO_DEMO,
    raciones: 4,
    tiempoMin: 45,
    dificultad: 'media',
    etiquetas: ['vegetariano', 'casero'],
    ingredientes: [
      { ingredienteId: 'espaguetis', cantidad: 400, unidad: 'g', indispensable: true },
      { ingredienteId: 'tomate-triturado', cantidad: 800, unidad: 'g', indispensable: true },
      { ingredienteId: 'albahaca', cantidad: 1, unidad: 'ud', indispensable: true },
      { ingredienteId: 'ajo', cantidad: 3, unidad: 'ud', indispensable: false },
      { ingredienteId: 'aceite-oliva', cantidad: 2, unidad: 'cda', indispensable: false },
      { ingredienteId: 'parmesano', cantidad: 50, unidad: 'g', indispensable: false },
    ],
    pasos: [
      { titulo: 'Aromatizar el aceite', descripcion: 'Dora el ajo laminado en aceite de oliva a fuego suave, sin que llegue a tostarse.' },
      { titulo: 'Salsa a fuego lento', descripcion: 'Añade el tomate, salpimienta y cocina 20 minutos a fuego bajo con unas hojas de albahaca.' },
      { titulo: 'Cocer la pasta', descripcion: 'Cuece los espaguetis en agua bien salada hasta que estén al dente. Reserva medio vaso del agua de cocción.' },
      { titulo: 'Unir y servir', descripcion: 'Saltea la pasta en la salsa con un chorrito del agua reservada. Sirve con parmesano rallado y albahaca.' },
    ],
    favorita: false,
    origen: 'amigo',
    autor: 'Lucía',
    aprendida: false,
    creadaEn: haceDias(2),
  },
];

/* --------------------------- Inventario inicial -------------------------- */

export const DESPENSA_SEED: ItemDespensa[] = [
  { ingredienteId: 'espinacas', cantidad: 150, stockMinimo: 100 },
  { ingredienteId: 'zanahoria', cantidad: 5, stockMinimo: 2 },
  { ingredienteId: 'leche-entera', cantidad: 1000, stockMinimo: 1000 },
  { ingredienteId: 'arroz-arborio', cantidad: 200, stockMinimo: 500 },
  { ingredienteId: 'huevo', cantidad: 6, stockMinimo: 4 },
  { ingredienteId: 'aceite-oliva', cantidad: 500, stockMinimo: 250 },
  { ingredienteId: 'sal', cantidad: 500, stockMinimo: 100 },
  { ingredienteId: 'ajo', cantidad: 4, stockMinimo: 2 },
  { ingredienteId: 'cebolla', cantidad: 3, stockMinimo: 1 },
  { ingredienteId: 'espaguetis', cantidad: 400, stockMinimo: 200 },
  { ingredienteId: 'harina', cantidad: 1000, stockMinimo: 300 },
  { ingredienteId: 'azucar', cantidad: 800, stockMinimo: 200 },
  { ingredienteId: 'mantequilla', cantidad: 250, stockMinimo: 100 },
  { ingredienteId: 'limon', cantidad: 2, stockMinimo: 1 },
  { ingredienteId: 'pimenton', cantidad: 50, stockMinimo: 10 },
  { ingredienteId: 'comino', cantidad: 30, stockMinimo: 10 },
  // Agotados: siguen en la lista para poder verlos y reponerlos rápido.
  { ingredienteId: 'parmesano', cantidad: 0, stockMinimo: 50 },
  { ingredienteId: 'tomate-triturado', cantidad: 0, stockMinimo: 400 },
];

/* Historial de movimientos de ejemplo (compras y consumos recientes). */
export const MOVIMIENTOS_SEED: MovimientoStock[] = [
  { id: 'm1', ingredienteId: 'leche-entera', delta: 2000, tipo: 'compra', fecha: haceDias(3), nota: 'Compra semanal' },
  { id: 'm2', ingredienteId: 'huevo', delta: 12, tipo: 'compra', fecha: haceDias(3), nota: 'Compra semanal' },
  { id: 'm3', ingredienteId: 'leche-entera', delta: -1000, tipo: 'consumo', fecha: haceDias(1), nota: 'Desayunos' },
  { id: 'm4', ingredienteId: 'huevo', delta: -6, tipo: 'cocinado', fecha: haceDias(1), nota: 'Shakshuka rústica' },
  { id: 'm5', ingredienteId: 'parmesano', delta: -50, tipo: 'consumo', fecha: haceDias(1), nota: 'Se acabó' },
];

/* Lista de la compra inicial vacía (se genera dinámicamente). */
export const LISTA_SEED: ItemListaCompra[] = [];

/* Menú semanal inicial vacío. */
export const MENU_SEED: EntradaMenu[] = [];

/* --------------------------------- Social -------------------------------- */

export const AMIGOS_SEED: Amigo[] = [
  { id: 'lucia', nombre: 'Lucía', avatar: 'https://i.pravatar.cc/96?img=47' },
  { id: 'marco', nombre: 'Marco', avatar: 'https://i.pravatar.cc/96?img=12' },
  { id: 'elena', nombre: 'Elena', avatar: 'https://i.pravatar.cc/96?img=32' },
];

export const FEED_SEED: PublicacionFeed[] = [
  {
    id: 'f1',
    amigoId: 'lucia',
    recetaTitulo: 'Pasta al pomodoro de la nonna',
    imagen: IMAGENES.pasta,
    texto: 'Domingo de salsa a fuego lento, huele toda la casa a Italia 🍅',
    fecha: haceDias(1),
    meGusta: false,
    likes: 14,
  },
  {
    id: 'f2',
    amigoId: 'marco',
    recetaTitulo: 'Risotto cremoso de champiñones',
    imagen: IMAGENES.risotto,
    texto: 'Primer risotto que no se me pasa de punto. ¡Por fin!',
    fecha: haceDias(2),
    meGusta: true,
    likes: 22,
  },
  {
    id: 'f3',
    amigoId: 'elena',
    recetaTitulo: 'Tarta de manzana clásica',
    imagen: IMAGENES.tarta,
    texto: 'El enrejado me ha costado media vida, pero mirad ese dorado…',
    fecha: haceDias(4),
    meGusta: false,
    likes: 31,
  },
];

export const SOLICITUDES_SEED: SolicitudReceta[] = [
  {
    id: 's1',
    amigoId: 'lucia',
    mensaje: '¡Pásame tu receta de pasta al pomodoro, porfa!',
    estado: 'recibida',
    fecha: haceDias(2),
    recetaId: 'pasta-pomodoro',
  },
];

/** Perfil del hogar con un miembro de ejemplo (editable en Perfil). */
export const PERFIL_SEED: PerfilHogar = {
  nombreHogar: 'Mi cocina',
  miembros: [
    {
      id: 'yo',
      nombre: 'Yo',
      color: '#3f5c3e',
      alergenos: [],
      preferencias: ['casero', 'rapido'],
      evitados: [],
      notas: '',
    },
  ],
};
