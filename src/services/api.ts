/**
 * Cliente HTTP de la API familiar (Railway).
 */
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export type SesionHogar = {
  token: string;
  hogar: { id: string; nombre: string; codigo: string };
  usuario: { id: string; nombre: string };
  version: number;
};

export type EstadoRemoto = {
  ingredientes: unknown[];
  recetas: unknown[];
  despensa: unknown[];
  movimientos: unknown[];
  listaCompra: unknown[];
  menu: unknown[];
  amigos: unknown[];
  feed: unknown[];
  solicitudes: unknown[];
  perfil: unknown;
  gastos?: unknown[];
};

async function pedir<T>(
  ruta: string,
  opciones: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = opciones;
  const res = await fetch(`${API_BASE}${ruta}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(cuerpo.error || `Error ${res.status}`) as Error & {
      status?: number;
      payload?: unknown;
    };
    error.status = res.status;
    error.payload = cuerpo;
    throw error;
  }
  return cuerpo as T;
}

export function apiDisponible(): boolean {
  // En local, el proxy de Vite cubre /api/auth y /api/state aunque VITE_API_URL esté vacío.
  return true;
}

export async function crearHogar(input: {
  nombreHogar: string;
  nombreUsuario: string;
  pin?: string;
  conDatosEjemplo?: boolean;
  estado?: EstadoRemoto;
}) {
  return pedir<{
    token: string;
    hogar: SesionHogar['hogar'];
    usuario: SesionHogar['usuario'];
    version: number;
    estado: EstadoRemoto;
  }>('/api/auth/crear', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function unirseHogar(input: {
  codigo: string;
  nombreUsuario: string;
  pin?: string;
}) {
  return pedir<{
    token: string;
    hogar: SesionHogar['hogar'];
    usuario: SesionHogar['usuario'];
    version: number;
    estado: EstadoRemoto;
  }>('/api/auth/unirse', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function obtenerEstado(token: string) {
  return pedir<{ version: number; estado: EstadoRemoto; actualizadoEn: string }>(
    '/api/state',
    { token },
  );
}

export async function guardarEstado(
  token: string,
  version: number,
  estado: EstadoRemoto,
) {
  return pedir<{ version: number; actualizadoEn: string }>('/api/state', {
    method: 'PUT',
    token,
    body: JSON.stringify({ version, estado }),
  });
}

export async function yo(token: string) {
  return pedir<{
    usuario: SesionHogar['usuario'];
    hogar: SesionHogar['hogar'];
  }>('/api/auth/yo', { token });
}

/* ----------------------------- Chef IA ----------------------------- */

export type RecetaIA = {
  titulo: string;
  descripcion: string;
  raciones: number;
  tiempoMin: number;
  dificultad: 'facil' | 'media' | 'dificil';
  etiquetas: string[];
  ingredientes: {
    nombre: string;
    cantidad: number;
    unidad: string;
    enDespensa: boolean;
  }[];
  pasos: { titulo: string; descripcion: string }[];
};

/** Momento del día para contextualizar al Chef IA (no confundir con TipoComida del menú). */
export type TipoMomentoChef = 'desayuno' | 'almuerzo' | 'cena';

export async function pedirRecetasIA(
  token: string,
  payload: {
    despensa: { nombre: string; cantidad: number; unidad: string }[];
    alergenos: string[];
    preferencias: string[];
    evitados: string[];
    /** Títulos ya propuestos que no deben repetirse. */
    evitarTitulos?: string[];
    /** Ingredientes recién añadidos a priorizar. */
    recientes?: string[];
    /** Desayuno, almuerzo o cena. */
    tipoComida?: TipoMomentoChef;
  },
) {
  return pedir<{ recetas: RecetaIA[] }>('/api/ia/recetas', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export type IngredienteFaltanteIA = {
  nombre: string;
  cantidad: number;
  unidad: string;
};

export type RespuestaChatChef = {
  mensaje: string;
  receta: RecetaIA | null;
  faltantes: IngredienteFaltanteIA[];
};

export async function chatChefIA(
  token: string,
  payload: {
    mensaje: string;
    historial: { role: 'user' | 'assistant'; content: string }[];
    despensa: { nombre: string; cantidad: number; unidad: string }[];
    alergenos: string[];
    preferencias: string[];
    evitados: string[];
    /** Desayuno, almuerzo o cena. */
    tipoComida?: TipoMomentoChef;
  },
) {
  return pedir<RespuestaChatChef>('/api/ia/chat', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function pedirCaloriasIA(
  token: string,
  payload: {
    titulo: string;
    raciones: number;
    ingredientes: { nombre: string; cantidad: number; unidad: string }[];
  },
) {
  return pedir<{ caloriasPorRacion: number; nota?: string }>('/api/ia/calorias', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}
