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
    datos.perfil &&
    typeof datos.perfil === 'object' &&
    Array.isArray(datos.perfil.miembros)
  );
}
