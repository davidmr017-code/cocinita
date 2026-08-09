import { useState } from 'react';

import type { AlergenoId, MiembroHogar, PreferenciaDieta } from '../domain/tipos';
import { useAppStore } from '../store/useAppStore';
import {
  ALERGENOS,
  COLORES_MIEMBRO,
  ETIQUETA_ALERGENO,
  ETIQUETA_PREFERENCIA,
  iniciales,
  PREFERENCIAS,
} from '../services/perfil';
import { EncabezadoPagina } from '../components/EncabezadoPagina';
import { Icono } from '../components/Icono';

function toggleEnLista<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];
}

function EditorMiembro({
  miembro,
  onGuardar,
  onEliminar,
  puedeEliminar,
}: {
  miembro: MiembroHogar;
  onGuardar: (m: MiembroHogar) => void;
  onEliminar: () => void;
  puedeEliminar: boolean;
}) {
  const [borrador, setBorrador] = useState(miembro);
  const [evitadoNuevo, setEvitadoNuevo] = useState('');
  const [guardado, setGuardado] = useState(false);

  const guardar = () => {
    onGuardar({
      ...borrador,
      nombre: borrador.nombre.trim() || miembro.nombre,
      evitados: borrador.evitados.map((e) => e.trim()).filter(Boolean),
    });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1800);
  };

  const anadirEvitado = () => {
    const t = evitadoNuevo.trim();
    if (!t) return;
    if (borrador.evitados.some((e) => e.toLowerCase() === t.toLowerCase())) {
      setEvitadoNuevo('');
      return;
    }
    setBorrador((b) => ({ ...b, evitados: [...b.evitados, t] }));
    setEvitadoNuevo('');
  };

  return (
    <div className="tarjeta p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: borrador.color ?? COLORES_MIEMBRO[0] }}
        >
          {iniciales(borrador.nombre)}
        </div>
        <input
          className="campo text-base font-semibold flex-1"
          value={borrador.nombre}
          onChange={(e) => setBorrador((b) => ({ ...b, nombre: e.target.value }))}
          aria-label="Nombre del miembro"
          placeholder="Nombre"
        />
      </div>

      <div>
        <p className="text-xs font-bold text-on-surface-variant mb-2">Color</p>
        <div className="flex gap-2 flex-wrap">
          {COLORES_MIEMBRO.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              onClick={() => setBorrador((b) => ({ ...b, color: c }))}
              className={`cursor-pointer w-8 h-8 rounded-xl transition-transform ${
                borrador.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-on-surface-variant mb-2 flex items-center gap-1">
          <Icono nombre="warning" className="text-sm text-secondary" /> Alérgenos e intolerancias
        </p>
        <div className="flex flex-wrap gap-2">
          {ALERGENOS.map((a) => {
            const activo = borrador.alergenos.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  setBorrador((b) => ({
                    ...b,
                    alergenos: toggleEnLista(b.alergenos, a.id) as AlergenoId[],
                  }))
                }
                className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activo
                    ? 'bg-error-container text-on-error-container border border-error/30'
                    : 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
                }`}
              >
                {a.etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-on-surface-variant mb-2 flex items-center gap-1">
          <Icono nombre="favorite" className="text-sm text-primary" /> Preferencias de comida
        </p>
        <div className="flex flex-wrap gap-2">
          {PREFERENCIAS.map((p) => {
            const activo = borrador.preferencias.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setBorrador((b) => ({
                    ...b,
                    preferencias: toggleEnLista(b.preferencias, p.id) as PreferenciaDieta[],
                  }))
                }
                className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activo
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
                }`}
              >
                {p.etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-on-surface-variant mb-2">Alimentos que evita</p>
        <div className="flex gap-2 mb-2">
          <input
            className="campo text-sm flex-1"
            value={evitadoNuevo}
            onChange={(e) => setEvitadoNuevo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), anadirEvitado())}
            placeholder="Ej.: cilantro, champiñones…"
          />
          <button type="button" onClick={anadirEvitado} className="btn-secundario py-2 px-3 shrink-0">
            <Icono nombre="add" />
          </button>
        </div>
        {borrador.evitados.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {borrador.evitados.map((e) => (
              <span
                key={e}
                className="etiqueta etiqueta-terracota inline-flex items-center gap-1"
              >
                {e}
                <button
                  type="button"
                  aria-label={`Quitar ${e}`}
                  onClick={() =>
                    setBorrador((b) => ({
                      ...b,
                      evitados: b.evitados.filter((x) => x !== e),
                    }))
                  }
                  className="cursor-pointer opacity-70 hover:opacity-100"
                >
                  <Icono nombre="close" className="text-sm" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <label className="text-xs font-bold text-on-surface-variant">
        Notas
        <textarea
          className="campo text-sm mt-1 font-normal"
          rows={2}
          value={borrador.notas ?? ''}
          onChange={(e) => setBorrador((b) => ({ ...b, notas: e.target.value }))}
          placeholder="Intolerancias leves, raciones preferidas…"
        />
      </label>

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={guardar} className="btn-primario">
          <Icono nombre="check" /> {guardado ? 'Guardado' : 'Guardar cambios'}
        </button>
        {puedeEliminar && (
          <button
            type="button"
            onClick={onEliminar}
            className="cursor-pointer px-4 py-2.5 rounded-xl border border-error/40 text-sm font-semibold text-error hover:bg-error-container/40 transition-colors"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * PERFIL DEL HOGAR — alérgenos, preferencias y miembros de la familia.
 */
export function PantallaPerfil() {
  const perfil = useAppStore((s) => s.perfil);
  const actualizarNombreHogar = useAppStore((s) => s.actualizarNombreHogar);
  const anadirMiembro = useAppStore((s) => s.anadirMiembro);
  const guardarMiembro = useAppStore((s) => s.guardarMiembro);
  const eliminarMiembro = useAppStore((s) => s.eliminarMiembro);

  const [nombreHogar, setNombreHogar] = useState(perfil.nombreHogar);
  const [miembroActivo, setMiembroActivo] = useState(perfil.miembros[0]?.id ?? '');
  const [nuevoNombre, setNuevoNombre] = useState('');

  const miembro = perfil.miembros.find((m) => m.id === miembroActivo) ?? perfil.miembros[0];

  const crearMiembro = () => {
    const id = anadirMiembro(nuevoNombre.trim() || 'Familiar');
    setNuevoNombre('');
    setMiembroActivo(id);
  };

  return (
    <div className="max-w-xl mx-auto">
      <EncabezadoPagina
        titulo="Perfil del hogar"
        subtitulo="Alérgenos, preferencias y gustos de cada persona en casa."
      />

      <section className="tarjeta p-4 mb-5">
        <label className="text-xs font-bold text-on-surface-variant">
          Nombre del hogar
          <input
            className="campo text-base mt-1 font-semibold"
            value={nombreHogar}
            onChange={(e) => setNombreHogar(e.target.value)}
            onBlur={() => actualizarNombreHogar(nombreHogar)}
            onKeyDown={(e) => e.key === 'Enter' && actualizarNombreHogar(nombreHogar)}
          />
        </label>
      </section>

      <section className="mb-4">
        <p className="text-sm font-bold text-on-surface-variant mb-2">Quién come en casa</p>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1 mb-3">
          {perfil.miembros.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMiembroActivo(m.id)}
              className={`cursor-pointer shrink-0 flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl border text-sm font-semibold transition-colors ${
                miembro?.id === m.id
                  ? 'border-primary bg-primary-fixed text-on-primary-fixed-variant'
                  : 'border-outline-variant bg-surface-container-lowest'
              }`}
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
                style={{ background: m.color ?? COLORES_MIEMBRO[0] }}
              >
                {iniciales(m.nombre)}
              </span>
              {m.nombre}
              {m.alergenos.length > 0 && (
                <span className="text-[10px] text-error font-bold">{m.alergenos.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="campo text-sm flex-1"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && crearMiembro()}
            placeholder="Añadir familiar (nombre)…"
          />
          <button type="button" onClick={crearMiembro} className="btn-primario shrink-0">
            <Icono nombre="person_add" /> Añadir
          </button>
        </div>
      </section>

      {miembro && (
        <EditorMiembro
          key={miembro.id}
          miembro={miembro}
          onGuardar={guardarMiembro}
          onEliminar={() => {
            if (confirm(`¿Eliminar a ${miembro.nombre} del perfil?`)) {
              eliminarMiembro(miembro.id);
              setMiembroActivo(perfil.miembros.find((m) => m.id !== miembro.id)?.id ?? '');
            }
          }}
          puedeEliminar={perfil.miembros.length > 1}
        />
      )}

      {/* Resumen rápido del hogar */}
      <section className="mt-6 tarjeta p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1">
          <Icono nombre="family_restroom" className="text-primary" /> Resumen del hogar
        </h3>
        <ul className="flex flex-col gap-3">
          {perfil.miembros.map((m) => (
            <li key={m.id} className="text-sm">
              <span className="font-bold">{m.nombre}</span>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {m.alergenos.length > 0
                  ? `Alérgenos: ${m.alergenos.map((a) => ETIQUETA_ALERGENO[a]).join(', ')}`
                  : 'Sin alérgenos registrados'}
                {m.preferencias.length > 0 &&
                  ` · ${m.preferencias.map((p) => ETIQUETA_PREFERENCIA[p]).join(', ')}`}
                {m.evitados.length > 0 && ` · Evita: ${m.evitados.join(', ')}`}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
