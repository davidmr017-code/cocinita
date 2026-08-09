/**
 * Sincronización del store de la app con Postgres (Railway).
 */
import { guardarEstado, obtenerEstado, type EstadoRemoto } from '../services/api';
import { useAppStore, type DatosBackup } from './useAppStore';
import { useAuthStore } from './useAuthStore';

let temporizador: ReturnType<typeof setTimeout> | null = null;
let ignorarProximosCambios = false;
let suscrito = false;

export function extraerEstadoApp(): EstadoRemoto {
  const s = useAppStore.getState();
  return {
    ingredientes: s.ingredientes,
    recetas: s.recetas,
    despensa: s.despensa,
    movimientos: s.movimientos,
    listaCompra: s.listaCompra,
    menu: s.menu,
    amigos: s.amigos,
    feed: s.feed,
    solicitudes: s.solicitudes,
    perfil: s.perfil,
    gastos: s.gastos,
  };
}

export function aplicarEstadoRemoto(estado: EstadoRemoto) {
  ignorarProximosCambios = true;
  useAppStore.getState().importarDatos(estado as DatosBackup);
  // Liberar el flag en el siguiente tick (tras los listeners de zustand).
  queueMicrotask(() => {
    ignorarProximosCambios = false;
  });
}

async function subirCambios() {
  const auth = useAuthStore.getState();
  if (auth.modo !== 'familia' || !auth.token) return;

  auth.setSincronizando(true);
  auth.setError(null);
  try {
    const resultado = await guardarEstado(auth.token, auth.version, extraerEstadoApp());
    auth.fijarVersion(resultado.version);
    auth.setUltimoSync(resultado.actualizadoEn);
  } catch (err) {
    const e = err as Error & {
      status?: number;
      payload?: { version?: number; estado?: EstadoRemoto; error?: string };
    };
    if (e.status === 409 && e.payload?.estado && typeof e.payload.version === 'number') {
      aplicarEstadoRemoto(e.payload.estado);
      auth.fijarVersion(e.payload.version);
      auth.setError('Había cambios de otro familiar: se han fusionado recargando.');
      auth.setUltimoSync(new Date().toISOString());
    } else {
      auth.setError(e.message || 'No se pudo sincronizar');
    }
  } finally {
    auth.setSincronizando(false);
  }
}

function programarSubida() {
  if (ignorarProximosCambios) return;
  const auth = useAuthStore.getState();
  if (auth.modo !== 'familia' || !auth.token) return;
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    void subirCambios();
  }, 900);
}

/** Activa la suscripción al store (llamar una vez al arrancar la app). */
export function iniciarSyncFamiliar() {
  if (suscrito) return;
  suscrito = true;
  useAppStore.subscribe(() => programarSubida());
}

/** Descarga el estado remoto tras login o al volver a la app. */
export async function refrescarDesdeServidor() {
  const auth = useAuthStore.getState();
  if (auth.modo !== 'familia' || !auth.token) return;
  auth.setSincronizando(true);
  auth.setError(null);
  try {
    const remoto = await obtenerEstado(auth.token);
    aplicarEstadoRemoto(remoto.estado);
    auth.fijarVersion(remoto.version);
    auth.setUltimoSync(remoto.actualizadoEn);
  } catch (err) {
    auth.setError(err instanceof Error ? err.message : 'No se pudo cargar el hogar');
  } finally {
    auth.setSincronizando(false);
  }
}

/** Subida inmediata (p. ej. al salir de ajustes). */
export async function forzarSync() {
  if (temporizador) clearTimeout(temporizador);
  await subirCambios();
}
