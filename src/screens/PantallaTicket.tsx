import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { TicketCompra } from '../domain/tipos';
import { aFechaISO, nuevoId } from '../domain/utilidades';
import {
  aCentimos,
  formatearEuro,
  quienDebePagarSiguiente,
  repartirIgual,
  sumaRepartos,
} from '../services/gastos';
import { leerTicketDesdeImagen } from '../services/ocrTicket';
import { useAppStore } from '../store/useAppStore';
import { EncabezadoPagina } from '../components/EncabezadoPagina';
import { Icono } from '../components/Icono';
import { SelectorFoto } from '../components/SelectorFoto';

/**
 * Alta / edición de un ticket: foto + OCR, total, quién paga y reparto.
 */
export function PantallaTicket() {
  const { id } = useParams();
  const esNuevo = !id || id === 'nuevo';
  const navigate = useNavigate();

  const miembros = useAppStore((s) => s.perfil.miembros);
  const gastos = useAppStore((s) => s.gastos);
  const guardarTicket = useAppStore((s) => s.guardarTicket);
  const eliminarTicket = useAppStore((s) => s.eliminarTicket);

  const existente = useMemo(
    () => (esNuevo ? undefined : gastos.find((t) => t.id === id)),
    [esNuevo, gastos, id],
  );

  const sugeridoPagar = useMemo(
    () => quienDebePagarSiguiente(gastos, miembros),
    [gastos, miembros],
  );

  const [foto, setFoto] = useState<string | undefined>(existente?.foto);
  const [comercio, setComercio] = useState(existente?.comercio ?? '');
  const [fecha, setFecha] = useState(existente?.fecha ?? aFechaISO(new Date()));
  const [total, setTotal] = useState(existente?.total?.toString() ?? '');
  const [notas, setNotas] = useState(existente?.notas ?? '');
  const [pagadoPorId, setPagadoPorId] = useState(
    existente?.pagadoPorId ?? sugeridoPagar?.miembroId ?? miembros[0]?.id ?? '',
  );
  const [seleccionados, setSeleccionados] = useState<string[]>(() => {
    if (existente?.repartos?.length) return existente.repartos.map((r) => r.miembroId);
    return miembros.map((m) => m.id);
  });
  const [importes, setImportes] = useState<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const r of existente?.repartos ?? []) {
      mapa[r.miembroId] = String(r.importe);
    }
    return mapa;
  });
  const [ocrPct, setOcrPct] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const totalNum = aCentimos(Number(String(total).replace(',', '.')) || 0);

  const aplicarRepartoIgual = (ids: string[], tot: number) => {
    const rep = repartirIgual(tot, ids);
    const mapa: Record<string, string> = {};
    for (const r of rep) mapa[r.miembroId] = String(r.importe);
    setImportes(mapa);
  };

  const alCambiarFoto = async (dataUrl: string | undefined) => {
    setFoto(dataUrl);
    setOcrError(null);
    if (!dataUrl) return;
    setOcrPct(0);
    try {
      const res = await leerTicketDesdeImagen(dataUrl, setOcrPct);
      if (res.comercio && !comercio.trim()) setComercio(res.comercio);
      if (res.fecha) setFecha(res.fecha);
      if (res.total != null) {
        setTotal(String(res.total));
        aplicarRepartoIgual(seleccionados, res.total);
      }
      setAviso('Ticket leído: revisa el total y el comercio');
      setTimeout(() => setAviso(null), 2800);
    } catch {
      setOcrError('No se pudo leer el ticket. Rellena el total a mano.');
    } finally {
      setOcrPct(null);
    }
  };

  const toggleMiembro = (miembroId: string) => {
    setSeleccionados((prev) => {
      const next = prev.includes(miembroId)
        ? prev.filter((id) => id !== miembroId)
        : [...prev, miembroId];
      aplicarRepartoIgual(next, totalNum);
      return next;
    });
  };

  const guardar = () => {
    if (totalNum <= 0) {
      setOcrError('Indica el importe total del ticket');
      return;
    }
    if (seleccionados.length === 0) {
      setOcrError('Elige al menos una persona del hogar');
      return;
    }

    const repartos = seleccionados.map((miembroId) => ({
      miembroId,
      importe: aCentimos(Number(String(importes[miembroId] ?? '0').replace(',', '.')) || 0),
    }));

    const ticket: TicketCompra = {
      id: existente?.id ?? nuevoId(),
      fecha,
      comercio: comercio.trim() || 'Compra',
      total: totalNum,
      foto,
      notas: notas.trim() || undefined,
      pagadoPorId: pagadoPorId || undefined,
      repartos,
      creadoEn: existente?.creadoEn ?? new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
    };

    guardarTicket(ticket);
    navigate('/gastos');
  };

  const diferencia = aCentimos(totalNum - sumaRepartos(
    seleccionados.map((miembroId) => ({
      miembroId,
      importe: aCentimos(Number(String(importes[miembroId] ?? '0').replace(',', '.')) || 0),
    })),
  ));

  if (!esNuevo && !existente) {
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        <p className="text-on-surface-variant mb-4">No se encontró este ticket.</p>
        <Link to="/gastos" className="btn-secundario">
          Volver a gastos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <EncabezadoPagina
        titulo={esNuevo ? 'Nuevo ticket' : 'Ticket'}
        subtitulo="Foto del ticket, total y a quién se asigna."
      />

      <div className="flex flex-col gap-4">
        <section className="tarjeta p-4 flex flex-col gap-2">
          <p className="text-xs font-bold text-on-surface-variant">Foto del ticket</p>
          <SelectorFoto valor={foto} onChange={(v) => void alCambiarFoto(v)} />
          {ocrPct != null && (
            <p className="text-xs text-primary font-semibold">Leyendo ticket… {ocrPct}%</p>
          )}
          {ocrError && (
            <p className="text-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{ocrError}</p>
          )}
        </section>

        <section className="tarjeta p-4 flex flex-col gap-3">
          <label className="text-xs font-bold text-on-surface-variant">
            Comercio
            <input
              className="campo text-sm mt-1 font-normal"
              value={comercio}
              onChange={(e) => setComercio(e.target.value)}
              placeholder="Mercadona, Lidl…"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-on-surface-variant">
              Fecha
              <input
                type="date"
                className="campo text-sm mt-1 font-normal"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </label>
            <label className="text-xs font-bold text-on-surface-variant">
              Total (€)
              <input
                className="campo text-sm mt-1 font-normal"
                inputMode="decimal"
                value={total}
                onChange={(e) => {
                  setTotal(e.target.value);
                  const n = aCentimos(Number(e.target.value.replace(',', '.')) || 0);
                  aplicarRepartoIgual(seleccionados, n);
                }}
                placeholder="0,00"
              />
            </label>
          </div>
          <label className="text-xs font-bold text-on-surface-variant">
            Quién pagó
            <select
              className="campo text-sm mt-1 font-normal"
              value={pagadoPorId}
              onChange={(e) => setPagadoPorId(e.target.value)}
            >
              {miembros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                  {sugeridoPagar?.miembroId === m.id && esNuevo ? ' (le toca)' : ''}
                </option>
              ))}
            </select>
          </label>
          {esNuevo && sugeridoPagar && (
            <p className="text-xs text-on-surface-variant -mt-1">
              Para equilibrar, sugerimos que pague{' '}
              <span className="font-semibold text-on-surface">{sugeridoPagar.nombre}</span>.
            </p>
          )}
          <label className="text-xs font-bold text-on-surface-variant">
            Notas
            <input
              className="campo text-sm mt-1 font-normal"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional"
            />
          </label>
        </section>

        <section className="tarjeta p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-on-surface-variant">Reparto entre el hogar</p>
            <button
              type="button"
              className="cursor-pointer text-xs font-bold text-primary"
              onClick={() => aplicarRepartoIgual(seleccionados, totalNum)}
            >
              Partes iguales
            </button>
          </div>

          {miembros.map((m) => {
            const activo = seleccionados.includes(m.id);
            return (
              <div key={m.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMiembro(m.id)}
                  className={`cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    activo ? '' : 'opacity-35'
                  }`}
                  style={{ background: m.color ?? '#3f5c3e' }}
                  aria-pressed={activo}
                >
                  {m.nombre.slice(0, 2).toUpperCase()}
                </button>
                <span className="flex-1 text-sm font-semibold truncate">{m.nombre}</span>
                <input
                  className="campo text-sm w-24 text-right font-normal"
                  inputMode="decimal"
                  disabled={!activo}
                  value={activo ? (importes[m.id] ?? '') : ''}
                  onChange={(e) =>
                    setImportes((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            );
          })}

          {diferencia !== 0 && totalNum > 0 && (
            <p className="text-xs text-secondary font-semibold">
              El reparto difiere del total en {formatearEuro(Math.abs(diferencia))}
              {diferencia > 0 ? ' (falta asignar)' : ' (sobra)'}
            </p>
          )}
        </section>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={guardar} className="btn-primario justify-center">
            <Icono nombre="save" /> Guardar ticket
          </button>
          {!esNuevo && existente && (
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Eliminar este ticket?')) {
                  eliminarTicket(existente.id);
                  navigate('/gastos');
                }
              }}
              className="cursor-pointer px-4 py-2.5 rounded-xl border border-error/40 text-sm font-semibold text-error hover:bg-error-container/40 transition-colors flex items-center justify-center gap-2"
            >
              <Icono nombre="delete" /> Eliminar
            </button>
          )}
          <Link to="/gastos" className="btn-secundario justify-center">
            Cancelar
          </Link>
        </div>
      </div>

      {aviso && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl text-sm z-50 sombra-cocina">
          {aviso}
        </div>
      )}
    </div>
  );
}
