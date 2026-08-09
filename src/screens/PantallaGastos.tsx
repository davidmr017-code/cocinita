import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAppStore } from '../store/useAppStore';
import {
  calcularSaldos,
  etiquetaSaldo,
  formatearEuro,
  mesActualISO,
  quienDebePagarSiguiente,
  ticketsDelMes,
  totalTickets,
  totalesPorMiembro,
} from '../services/gastos';
import { EncabezadoPagina } from '../components/EncabezadoPagina';
import { Icono } from '../components/Icono';

/**
 * GASTOS DEL HOGAR — resumen, equilibrio (quién paga) y tickets.
 */
export function PantallaGastos() {
  const gastos = useAppStore((s) => s.gastos);
  const miembros = useAppStore((s) => s.perfil.miembros);
  const [mes, setMes] = useState(mesActualISO());
  const [periodoSaldo, setPeriodoSaldo] = useState<'mes' | 'todo'>('todo');

  const delMes = useMemo(() => ticketsDelMes(gastos, mes), [gastos, mes]);
  const totalMes = totalTickets(delMes);
  const porMiembro = useMemo(
    () => totalesPorMiembro(delMes, miembros).sort((a, b) => b.total - a.total),
    [delMes, miembros],
  );

  const ticketsParaSaldo = periodoSaldo === 'mes' ? delMes : gastos;
  const saldos = useMemo(
    () => calcularSaldos(ticketsParaSaldo, miembros),
    [ticketsParaSaldo, miembros],
  );
  const siguiente = useMemo(
    () => quienDebePagarSiguiente(ticketsParaSaldo, miembros),
    [ticketsParaSaldo, miembros],
  );

  const ordenados = useMemo(
    () => [...delMes].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn)),
    [delMes],
  );

  const nombreMiembro = (id?: string) =>
    miembros.find((m) => m.id === id)?.nombre ?? 'Sin asignar';

  const equilibrados =
    saldos.length > 0 && saldos.every((s) => Math.abs(s.saldo) < 0.01);

  return (
    <div className="max-w-lg mx-auto">
      <EncabezadoPagina
        titulo="Gastos"
        subtitulo="Tickets, saldos y a quién le toca comprar."
      />

      <div className="flex gap-2 mb-4">
        <Link to="/gastos/nuevo" className="btn-primario flex-1 justify-center">
          <Icono nombre="receipt_long" /> Escanear ticket
        </Link>
      </div>

      {siguiente && miembros.length > 1 && (
        <section className="tarjeta p-4 mb-4 border-primary-fixed-dim bg-primary-fixed/30">
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: siguiente.color ?? '#3f5c3e' }}
            >
              {siguiente.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-on-primary-fixed-variant">
                Le toca comprar / pagar
              </p>
              <p className="text-xl font-bold text-on-surface leading-tight">{siguiente.nombre}</p>
              <p className="text-sm text-on-surface-variant mt-1">
                {equilibrados
                  ? 'Estáis empatados: puede pagar cualquiera; sugerimos empezar por esta persona.'
                  : Math.abs(siguiente.saldo) < 0.01
                    ? 'Para seguir equilibrados, que pague esta persona la próxima compra.'
                    : `Ha puesto ${formatearEuro(Math.abs(siguiente.saldo))} de menos que su parte. Si paga la próxima, se iguala.`}
              </p>
            </div>
          </div>
          <Link
            to="/gastos/nuevo"
            className="btn-secundario mt-3 w-full justify-center text-sm"
          >
            <Icono nombre="shopping_bag" /> Registrar compra de {siguiente.nombre}
          </Link>
        </section>
      )}

      <section className="tarjeta p-4 mb-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-semibold text-base">Equilibrio del hogar</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Pagado en caja menos su parte del gasto
            </p>
          </div>
          <div className="flex rounded-xl border border-outline-variant overflow-hidden text-xs font-bold">
            <button
              type="button"
              onClick={() => setPeriodoSaldo('todo')}
              className={`cursor-pointer px-2.5 py-1.5 ${
                periodoSaldo === 'todo'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant'
              }`}
            >
              Todo
            </button>
            <button
              type="button"
              onClick={() => setPeriodoSaldo('mes')}
              className={`cursor-pointer px-2.5 py-1.5 ${
                periodoSaldo === 'mes'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant'
              }`}
            >
              Mes
            </button>
          </div>
        </div>

        {saldos.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Añade miembros en el perfil del hogar.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {saldos.map((s) => (
              <div key={s.miembroId} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: s.color ?? '#3f5c3e' }}
                >
                  {s.nombre.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">{s.nombre}</span>
                    <span
                      className={`text-sm font-bold tabular-nums shrink-0 ${
                        s.saldo > 0.009
                          ? 'text-primary'
                          : s.saldo < -0.009
                            ? 'text-secondary'
                            : 'text-on-surface-variant'
                      }`}
                    >
                      {etiquetaSaldo(s.saldo)}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Pagó {formatearEuro(s.pagado)} · Su parte {formatearEuro(s.consumo)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="tarjeta p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <label className="text-xs font-bold text-on-surface-variant">
            Mes
            <input
              type="month"
              className="campo text-sm mt-1 font-normal"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </label>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              Total del mes
            </p>
            <p className="text-2xl font-bold text-primary">{formatearEuro(totalMes)}</p>
            <p className="text-xs text-on-surface-variant">{delMes.length} tickets</p>
          </div>
        </div>

        {porMiembro.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/50">
            <p className="text-xs font-bold text-on-surface-variant mb-1">Parte del gasto (mes)</p>
            {porMiembro.map((m) => (
              <div key={m.miembroId} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: m.color ?? '#3f5c3e' }}
                >
                  {m.nombre.slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-semibold truncate">{m.nombre}</span>
                <span className="text-sm font-bold tabular-nums">{formatearEuro(m.total)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-on-surface-variant px-1">Tickets</h2>
        {ordenados.length === 0 && (
          <div className="tarjeta p-6 text-center text-on-surface-variant">
            <Icono nombre="receipt" className="text-4xl text-primary mb-2" />
            <p className="text-sm font-semibold text-on-surface">Aún no hay tickets este mes</p>
            <p className="text-xs mt-1">Fotografíalo en la caja y asígnalo a quien toque.</p>
          </div>
        )}
        {ordenados.map((t) => (
          <Link
            key={t.id}
            to={`/gastos/${t.id}`}
            className="tarjeta p-3 flex gap-3 hover:border-primary-fixed-dim transition-colors cursor-pointer"
          >
            {t.foto ? (
              <img
                src={t.foto}
                alt=""
                className="w-16 h-16 rounded-xl object-cover shrink-0 bg-surface-container"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0">
                <Icono nombre="receipt_long" className="text-secondary text-2xl" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold truncate">{t.comercio || 'Compra'}</p>
                <p className="font-bold text-primary tabular-nums shrink-0">
                  {formatearEuro(t.total)}
                </p>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
                {t.pagadoPorId ? ` · Pagó ${nombreMiembro(t.pagadoPorId)}` : ''}
              </p>
              <p className="text-xs text-on-surface-variant mt-1 truncate">
                {t.repartos
                  .filter((r) => r.importe > 0)
                  .map((r) => `${nombreMiembro(r.miembroId)} ${formatearEuro(r.importe)}`)
                  .join(' · ') || 'Sin reparto'}
              </p>
            </div>
            <Icono nombre="chevron_right" className="text-on-surface-variant self-center" />
          </Link>
        ))}
      </section>
    </div>
  );
}
