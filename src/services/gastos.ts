/**
 * Reglas de gastos familiares: reparto, totales y parseo de tickets OCR.
 */
import type { MiembroHogar, RepartoGasto, TicketCompra } from '../domain/tipos';

const formatoEuro = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

export function formatearEuro(importe: number): string {
  return formatoEuro.format(Number.isFinite(importe) ? importe : 0);
}

/** Redondeo a céntimos (evita 3.333… en repartos). */
export function aCentimos(importe: number): number {
  return Math.round((importe + Number.EPSILON) * 100) / 100;
}

/** Reparte el total a partes iguales entre los miembros indicados. */
export function repartirIgual(total: number, miembroIds: string[]): RepartoGasto[] {
  if (miembroIds.length === 0 || !Number.isFinite(total) || total < 0) return [];
  const base = aCentimos(total / miembroIds.length);
  const repartos = miembroIds.map((miembroId) => ({ miembroId, importe: base }));
  // Ajuste del último para que sume exactamente el total
  const suma = aCentimos(repartos.reduce((acc, r) => acc + r.importe, 0));
  const diff = aCentimos(total - suma);
  if (repartos.length > 0 && diff !== 0) {
    repartos[repartos.length - 1] = {
      ...repartos[repartos.length - 1],
      importe: aCentimos(repartos[repartos.length - 1].importe + diff),
    };
  }
  return repartos;
}

export function sumaRepartos(repartos: RepartoGasto[]): number {
  return aCentimos(repartos.reduce((acc, r) => acc + (r.importe || 0), 0));
}

export function ticketValido(t: Partial<TicketCompra>): boolean {
  return (
    typeof t.total === 'number' &&
    t.total >= 0 &&
    typeof t.fecha === 'string' &&
    Boolean(t.fecha) &&
    Array.isArray(t.repartos)
  );
}

/** Gasto asignado a cada miembro (suma de repartos) en un periodo. */
export function totalesPorMiembro(
  tickets: TicketCompra[],
  miembros: MiembroHogar[],
): { miembroId: string; nombre: string; color?: string; total: number }[] {
  const mapa = new Map<string, number>();
  for (const t of tickets) {
    for (const r of t.repartos) {
      mapa.set(r.miembroId, aCentimos((mapa.get(r.miembroId) ?? 0) + r.importe));
    }
  }
  return miembros.map((m) => ({
    miembroId: m.id,
    nombre: m.nombre,
    color: m.color,
    total: mapa.get(m.id) ?? 0,
  }));
}

export type SaldoMiembro = {
  miembroId: string;
  nombre: string;
  color?: string;
  /** Lo que ha pagado en caja. */
  pagado: number;
  /** Su parte del gasto (reparto). */
  consumo: number;
  /**
   * pagado − consumo.
   * Positivo: ha adelantado dinero (le deben).
   * Negativo: debe ponerse al día (le toca pagar).
   */
  saldo: number;
};

/**
 * Saldos para equilibrar: quién ha pagado de más o de menos
 * respecto a su parte de las compras.
 */
export function calcularSaldos(
  tickets: TicketCompra[],
  miembros: MiembroHogar[],
): SaldoMiembro[] {
  const pagado = new Map<string, number>();
  const consumo = new Map<string, number>();

  for (const t of tickets) {
    if (t.pagadoPorId) {
      pagado.set(t.pagadoPorId, aCentimos((pagado.get(t.pagadoPorId) ?? 0) + (t.total || 0)));
    }
    for (const r of t.repartos) {
      consumo.set(r.miembroId, aCentimos((consumo.get(r.miembroId) ?? 0) + (r.importe || 0)));
    }
  }

  return miembros
    .map((m) => {
      const p = pagado.get(m.id) ?? 0;
      const c = consumo.get(m.id) ?? 0;
      return {
        miembroId: m.id,
        nombre: m.nombre,
        color: m.color,
        pagado: p,
        consumo: c,
        saldo: aCentimos(p - c),
      };
    })
    .sort((a, b) => a.saldo - b.saldo);
}

/**
 * Quién debería pagar/comprar a continuación para igualar
 * (el saldo más bajo = quien más debe ponerse al día).
 */
export function quienDebePagarSiguiente(
  tickets: TicketCompra[],
  miembros: MiembroHogar[],
): SaldoMiembro | null {
  if (miembros.length === 0) return null;
  const saldos = calcularSaldos(tickets, miembros);
  if (tickets.length === 0) return saldos[0] ?? null;

  const minimo = saldos[0];
  if (!minimo) return null;

  // Si todos están empatados (o casi), cualquiera vale; preferimos el más bajo.
  const empatados = saldos.filter((s) => Math.abs(s.saldo - minimo.saldo) < 0.01);
  if (empatados.length === saldos.length && Math.abs(minimo.saldo) < 0.01) {
    return minimo;
  }
  return minimo;
}

/** Texto corto del estado de saldo. */
export function etiquetaSaldo(saldo: number): string {
  if (Math.abs(saldo) < 0.01) return 'En equilibrio';
  if (saldo > 0) return `Le deben ${formatearEuro(saldo)}`;
  return `Debe ${formatearEuro(Math.abs(saldo))}`;
}

export function totalTickets(tickets: TicketCompra[]): number {
  return aCentimos(tickets.reduce((acc, t) => acc + (t.total || 0), 0));
}

/** Filtra tickets del mes (YYYY-MM) en hora local. */
export function ticketsDelMes(tickets: TicketCompra[], ym: string): TicketCompra[] {
  return tickets.filter((t) => t.fecha.startsWith(ym));
}

export function mesActualISO(fecha = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Extrae comercio, total y fecha aproximada del texto OCR de un ticket ES.
 */
export function parsearTextoTicket(texto: string): {
  comercio?: string;
  total?: number;
  fecha?: string;
} {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let total: number | undefined;
  const importes: number[] = [];

  for (const linea of lineas) {
    const lower = linea.toLocaleLowerCase('es');
    const matchEtiqueta =
      /(?:total|importe|a\s*pagar|total\s*compra|total\s*eur)\s*[:\-]?\s*(\d+[.,]\d{2})/i.exec(
        linea,
      );
    if (matchEtiqueta) {
      total = parseImporte(matchEtiqueta[1]);
      break;
    }
    for (const m of linea.matchAll(/(\d+[.,]\d{2})\s*€?/g)) {
      const n = parseImporte(m[1]);
      if (n != null && n > 0 && n < 10000) importes.push(n);
    }
    if (/total/i.test(lower) && importes.length) {
      total = importes[importes.length - 1];
    }
  }

  if (total == null && importes.length) {
    total = Math.max(...importes);
  }

  let fecha: string | undefined;
  for (const linea of lineas) {
    const dmy = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(linea);
    if (dmy) {
      const d = dmy[1].padStart(2, '0');
      const m = dmy[2].padStart(2, '0');
      let y = dmy[3];
      if (y.length === 2) y = `20${y}`;
      fecha = `${y}-${m}-${d}`;
      break;
    }
  }

  // Comercio: primera línea “decente” (sin solo números)
  const comercio = lineas.find(
    (l) => l.length >= 3 && l.length <= 40 && !/^\d+([.,]\d+)?$/.test(l) && !/total/i.test(l),
  );

  return { comercio, total, fecha };
}

function parseImporte(raw: string): number | undefined {
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? aCentimos(n) : undefined;
}
