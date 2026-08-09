/**
 * Utilidades transversales pequeñas (ids, fechas, texto).
 */

/** Identificador único corto, suficiente para almacenamiento local. */
export function nuevoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Normaliza texto para comparar nombres ("Tomate " ≈ "tomate"). */
export function normalizar(texto: string): string {
  return texto
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Fecha YYYY-MM-DD de un objeto Date (en hora local). */
export function aFechaISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Los 7 días de la semana actual (empezando en lunes). */
export function diasDeLaSemana(referencia = new Date()): Date[] {
  const dia = referencia.getDay(); // 0=domingo
  const lunes = new Date(referencia);
  lunes.setDate(referencia.getDate() - ((dia + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const f = new Date(lunes);
    f.setDate(lunes.getDate() + i);
    return f;
  });
}

const formatoRelativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** "hace 2 días", "ayer"... a partir de una fecha ISO. */
export function tiempoRelativo(fechaISO: string): string {
  const dias = Math.round(
    (new Date(fechaISO).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
  if (dias === 0) return 'hoy';
  return formatoRelativo.format(dias, 'day');
}

export type EstadoCaducidad = 'caducado' | 'pronto' | 'ok';

/**
 * Estado de caducidad de un producto.
 * - caducado: fecha ya pasada
 * - pronto: caduca en 3 días o menos (incluye hoy)
 * - ok: más de 3 días, o sin fecha
 */
export function estadoCaducidad(fecha?: string): EstadoCaducidad {
  if (!fecha) return 'ok';
  const dias = diasHastaCaducidad(fecha);
  if (dias === null) return 'ok';
  if (dias < 0) return 'caducado';
  if (dias <= 3) return 'pronto';
  return 'ok';
}

/** Días hasta la caducidad (negativo = ya caducó). null si no hay fecha válida. */
export function diasHastaCaducidad(fecha?: string): number | null {
  if (!fecha) return null;
  const partes = fecha.split('-').map(Number);
  if (partes.length !== 3 || partes.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = partes;
  const caduca = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  caduca.setHours(0, 0, 0, 0);
  return Math.round((caduca.getTime() - hoy.getTime()) / (24 * 60 * 60 * 1000));
}

/** Etiqueta legible: "Caducado", "Caduca hoy", "Caduca en 2 días". */
export function etiquetaCaducidad(fecha?: string): string | null {
  const dias = diasHastaCaducidad(fecha);
  if (dias === null) return null;
  if (dias < 0) return 'Caducado';
  if (dias === 0) return 'Caduca hoy';
  if (dias === 1) return 'Caduca mañana';
  if (dias <= 3) return `Caduca en ${dias} días`;
  return null;
}
