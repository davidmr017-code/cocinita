import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Receta, Unidad } from '../domain/tipos';
import { nuevoId } from '../domain/utilidades';
import { pedirRecetasIA, type RecetaIA } from '../services/api';
import { sugerirCategoriaPorNombre } from '../services/categoriasProducto';
import { ETIQUETA_ALERGENO, ETIQUETA_PREFERENCIA } from '../services/perfil';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTraduccion } from '../i18n/useTraduccion';
import { EncabezadoPagina } from '../components/EncabezadoPagina';
import { Icono } from '../components/Icono';

const UNIDADES_VALIDAS: Unidad[] = ['g', 'kg', 'ml', 'l', 'ud', 'cda', 'cdta'];

function aUnidad(u: string): Unidad {
  return (UNIDADES_VALIDAS as string[]).includes(u) ? (u as Unidad) : 'ud';
}

/**
 * CHEF IA — propone recetas con lo que hay en la despensa (Groq vía API).
 */
export function PantallaChef() {
  const { t } = useTraduccion();
  const navigate = useNavigate();
  const despensa = useAppStore((s) => s.despensa);
  const catalogo = useAppStore((s) => s.ingredientes);
  const perfil = useAppStore((s) => s.perfil);
  const asegurarIngrediente = useAppStore((s) => s.asegurarIngrediente);
  const guardarReceta = useAppStore((s) => s.guardarReceta);

  const modo = useAuthStore((s) => s.modo);
  const token = useAuthStore((s) => s.token);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propuestas, setPropuestas] = useState<RecetaIA[] | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [guardadas, setGuardadas] = useState<Set<number>>(new Set());

  const fichas = useMemo(() => new Map(catalogo.map((i) => [i.id, i])), [catalogo]);

  const conStock = useMemo(
    () =>
      despensa
        .filter((i) => i.cantidad > 0)
        .map((i) => {
          const ficha = fichas.get(i.ingredienteId);
          return ficha
            ? { nombre: ficha.nombre, cantidad: i.cantidad, unidad: ficha.unidadBase }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [despensa, fichas],
  );

  const pedir = async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    setPropuestas(null);
    setGuardadas(new Set());
    try {
      const alergenos = [
        ...new Set(perfil.miembros.flatMap((m) => m.alergenos.map((a) => ETIQUETA_ALERGENO[a] ?? a))),
      ];
      const preferencias = [
        ...new Set(
          perfil.miembros.flatMap((m) => m.preferencias.map((p) => ETIQUETA_PREFERENCIA[p] ?? p)),
        ),
      ];
      const evitados = [...new Set(perfil.miembros.flatMap((m) => m.evitados))];

      const res = await pedirRecetasIA(token, {
        despensa: conStock,
        alergenos,
        preferencias,
        evitados,
      });
      setPropuestas(res.recetas);
      setAbierta(res.recetas.length > 0 ? 0 : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron generar recetas');
    } finally {
      setCargando(false);
    }
  };

  const guardar = (receta: RecetaIA, indice: number) => {
    const nueva: Receta = {
      id: nuevoId(),
      titulo: receta.titulo,
      descripcion: receta.descripcion,
      raciones: receta.raciones,
      tiempoMin: receta.tiempoMin,
      dificultad: receta.dificultad,
      etiquetas: [...new Set([...receta.etiquetas, 'chef ia'])],
      ingredientes: receta.ingredientes.map((ing) => ({
        ingredienteId: asegurarIngrediente(
          ing.nombre,
          sugerirCategoriaPorNombre(ing.nombre),
          aUnidad(ing.unidad) === 'ml' || aUnidad(ing.unidad) === 'l' ? 'ml' : aUnidad(ing.unidad) === 'ud' || aUnidad(ing.unidad) === 'cda' || aUnidad(ing.unidad) === 'cdta' ? 'ud' : 'g',
        ),
        cantidad: ing.cantidad,
        unidad: aUnidad(ing.unidad),
        indispensable: ing.enDespensa,
      })),
      pasos: receta.pasos,
      favorita: false,
      origen: 'descubierta',
      autor: 'Chef IA',
      aprendida: false,
      creadaEn: new Date().toISOString(),
    };
    guardarReceta(nueva);
    setGuardadas((prev) => new Set(prev).add(indice));
  };

  if (modo !== 'familia' || !token) {
    return (
      <div className="max-w-lg mx-auto">
        <EncabezadoPagina titulo={t('chef.titulo')} subtitulo={t('chef.subtituloCasa')} />
        <div className="tarjeta p-6 text-center text-on-surface-variant">
          <Icono nombre="cloud_off" className="text-4xl text-primary mb-2" />
          <p className="text-sm font-semibold text-on-surface">{t('chef.cocinaNube')}</p>
          <p className="text-xs mt-1">{t('chef.cocinaNubeSub')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <EncabezadoPagina
        titulo={t('chef.titulo')}
        subtitulo={t('chef.subtitulo', { n: conStock.length })}
      />

      <button
        type="button"
        onClick={() => void pedir()}
        disabled={cargando || conStock.length === 0}
        className="btn-primario w-full justify-center mb-4 disabled:opacity-40"
      >
        <Icono nombre={cargando ? 'hourglass_top' : 'auto_awesome'} />
        {cargando ? t('chef.pensando') : t('chef.cta')}
      </button>

      {conStock.length === 0 && (
        <p className="text-sm text-on-surface-variant text-center mb-4">
          Tu despensa está vacía. Añade ingredientes o escanea productos primero.
        </p>
      )}

      {error && (
        <p className="text-sm text-error bg-error-container/50 rounded-xl px-3 py-2 mb-4">{error}</p>
      )}

      {cargando && (
        <div className="tarjeta p-6 text-center text-on-surface-variant animate-pulse">
          <Icono nombre="skillet" className="text-4xl text-primary mb-2" />
          <p className="text-sm">{t('chef.mirando')}</p>
        </div>
      )}

      {propuestas && (
        <div className="flex flex-col gap-3">
          {propuestas.map((r, idx) => {
            const abiertaEsta = abierta === idx;
            const yaGuardada = guardadas.has(idx);
            return (
              <div key={idx} className="tarjeta p-4">
                <button
                  type="button"
                  onClick={() => setAbierta(abiertaEsta ? null : idx)}
                  className="cursor-pointer w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif font-semibold text-lg leading-tight">{r.titulo}</h3>
                    <Icono
                      nombre={abiertaEsta ? 'expand_less' : 'expand_more'}
                      className="text-on-surface-variant shrink-0"
                    />
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">{r.descripcion}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <Icono nombre="schedule" className="text-sm" /> {r.tiempoMin} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Icono nombre="group" className="text-sm" /> {r.raciones} rac.
                    </span>
                    <span className="flex items-center gap-1">
                      <Icono nombre="signal_cellular_alt" className="text-sm" /> {r.dificultad}
                    </span>
                  </div>
                </button>

                {abiertaEsta && (
                  <div className="mt-3 pt-3 border-t border-outline-variant/50">
                    <p className="text-xs font-bold text-on-surface-variant mb-2">{t('chef.ingredientes')}</p>
                    <ul className="flex flex-col gap-1 mb-3">
                      {r.ingredientes.map((ing, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <Icono
                            nombre={ing.enDespensa ? 'check_circle' : 'add_shopping_cart'}
                            className={`text-base ${ing.enDespensa ? 'text-primary' : 'text-secondary'}`}
                          />
                          <span className="flex-1">
                            {ing.nombre}{' '}
                            <span className="text-on-surface-variant">
                              — {ing.cantidad} {ing.unidad}
                            </span>
                          </span>
                          {!ing.enDespensa && (
                            <span className="text-[10px] text-secondary font-semibold">falta</span>
                          )}
                        </li>
                      ))}
                    </ul>

                    <p className="text-xs font-bold text-on-surface-variant mb-2">{t('chef.pasos')}</p>
                    <ol className="flex flex-col gap-2 mb-4">
                      {r.pasos.map((p, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="w-6 h-6 rounded-lg bg-primary-fixed text-primary text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-semibold">{p.titulo}</p>
                            <p className="text-on-surface-variant">{p.descripcion}</p>
                          </div>
                        </li>
                      ))}
                    </ol>

                    <button
                      type="button"
                      onClick={() => guardar(r, idx)}
                      disabled={yaGuardada}
                      className="btn-primario w-full justify-center disabled:opacity-50"
                    >
                      <Icono nombre={yaGuardada ? 'check' : 'bookmark_add'} />
                      {yaGuardada ? t('chef.guardada') : t('chef.guardar')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => void pedir()}
            disabled={cargando}
            className="btn-secundario justify-center"
          >
            <Icono nombre="refresh" /> {t('chef.otras')}
          </button>

          {guardadas.size > 0 && (
            <button
              type="button"
              onClick={() => navigate('/recetas')}
              className="cursor-pointer text-sm text-primary font-semibold underline text-center"
            >
              {t('chef.verGuardadas')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
