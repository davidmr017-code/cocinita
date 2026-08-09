/**
 * Estado inicial del hogar (misma forma que el store de Cocinita).
 * Se clona al crear un hogar nuevo.
 */
export const ESTADO_INICIAL = {
  ingredientes: [],
  recetas: [],
  despensa: [],
  movimientos: [],
  listaCompra: [],
  menu: [],
  amigos: [],
  feed: [],
  solicitudes: [],
  gastos: [],
  perfil: {
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
  },
};

const COLORES_MIEMBRO = ['#3f5c3e', '#c45c26', '#5b7c99', '#8b5a6b', '#6b8e4e', '#b8860b'];

export function clonarEstado(base = ESTADO_INICIAL) {
  return structuredClone(base);
}

export function esEstadoValido(datos) {
  if (!datos || typeof datos !== 'object') return false;
  return (
    Array.isArray(datos.ingredientes) &&
    Array.isArray(datos.recetas) &&
    Array.isArray(datos.despensa) &&
    Array.isArray(datos.movimientos) &&
    Array.isArray(datos.listaCompra) &&
    Array.isArray(datos.menu) &&
    Array.isArray(datos.amigos) &&
    Array.isArray(datos.feed) &&
    Array.isArray(datos.solicitudes) &&
    (datos.gastos === undefined || Array.isArray(datos.gastos)) &&
    datos.perfil &&
    typeof datos.perfil === 'object' &&
    Array.isArray(datos.perfil.miembros)
  );
}

/** Perfil mínimo de un usuario autenticado del hogar. */
export function perfilMiembroNuevo(usuario, indice = 0) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    color: COLORES_MIEMBRO[indice % COLORES_MIEMBRO.length],
    alergenos: [],
    preferencias: ['casero', 'rapido'],
    evitados: [],
    notas: '',
  };
}

/**
 * Garantiza que un usuario autenticado aparezca en perfil.miembros
 * (lo que muestra la pantalla Perfil del hogar).
 */
export function incorporarUsuarioAlPerfil(estado, usuario) {
  const base = clonarEstado(estado);
  if (!base.perfil || typeof base.perfil !== 'object') {
    base.perfil = { nombreHogar: 'Mi cocina', miembros: [] };
  }
  const miembros = Array.isArray(base.perfil.miembros) ? [...base.perfil.miembros] : [];

  if (miembros.some((m) => m.id === usuario.id)) {
    return { estado: base, changed: false };
  }

  const idxNombre = miembros.findIndex(
    (m) => String(m.nombre || '').toLowerCase() === String(usuario.nombre || '').toLowerCase(),
  );
  if (idxNombre >= 0) {
    miembros[idxNombre] = { ...miembros[idxNombre], id: usuario.id, nombre: usuario.nombre };
    base.perfil = { ...base.perfil, miembros };
    return { estado: base, changed: true };
  }

  miembros.push(perfilMiembroNuevo(usuario, miembros.length));
  base.perfil = { ...base.perfil, miembros };
  return { estado: base, changed: true };
}
