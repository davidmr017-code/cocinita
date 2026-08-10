import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Receta, Unidad } from '../domain/tipos';
import { nuevoId } from '../domain/utilidades';
import {
  chatChefIA,
  pedirCaloriasIA,
  pedirRecetasIA,
  type IngredienteFaltanteIA,
  type RecetaIA,
} from '../services/api';
import { sugerirCategoriaPorNombre } from '../services/categoriasProducto';
import { ETIQUETA_ALERGENO, ETIQUETA_PREFERENCIA } from '../services/perfil';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTraduccion } from '../i18n/useTraduccion';
import { Chip } from '../components/Chip';
import { EncabezadoPagina } from '../components/EncabezadoPagina';
import { Icono } from '../components/Icono';

const UNIDADES_VALIDAS: Unidad[] = ['g', 'kg', 'ml', 'l', 'ud', 'cda', 'cdta'];

function aUnidad(u: string): Unidad {
  return (UNIDADES_VALIDAS as string[]).includes(u) ? (u as Unidad) : 'ud';
}

function aUnidadBase(u: string): 'g' | 'ml' | 'ud' {
  const unidad = aUnidad(u);
  if (unidad === 'ml' || unidad === 'l') return 'ml';
  if (unidad === 'ud' || unidad === 'cda' || unidad === 'cdta') return 'ud';
  return 'g';
}

type VistaChef = 'sugerencias' | 'chat';

type MensajeChat = {
  id: string;
  role: 'user' | 'assistant';
  texto: string;
  receta?: RecetaIA;
  faltantes?: IngredienteFaltanteIA[];
};

function recetaIAaReceta(
  receta: RecetaIA,
  asegurarIngrediente: ReturnType<typeof useAppStore.getState>['asegurarIngrediente'],
): Receta {
  return {
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
        aUnidadBase(ing.unidad),
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
}

function TarjetaRecetaChef({
  receta,
  expandida,
  onToggle,
  onGuardar,
  guardada,
  faltantes,
  onAnadirFaltantes,
  anadidoCompra,
  t,
}: {
  receta: RecetaIA;
  expandida: boolean;
  onToggle: () => void;
  onGuardar: () => void;
  guardada: boolean;
  faltantes?: IngredienteFaltanteIA[];
  onAnadirFaltantes?: () => void;
  anadidoCompra?: boolean;
  t: ReturnType<typeof useTraduccion>['t'];
}) {
  const faltan = faltantes ?? receta.ingredientes.filter((i) => !i.enDespensa);

  return (
    <div className="tarjeta p-4">
      <button type="button" onClick={onToggle} className="cursor-pointer w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif font-semibold text-lg leading-tight">{receta.titulo}</h3>
          <Icono
            nombre={expandida ? 'expand_less' : 'expand_more'}
            className="text-on-surface-variant shrink-0"
          />
        </div>
        <p className="text-sm text-on-surface-variant mt-1">{receta.descripcion}</p>
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <Icono nombre="schedule" className="text-sm" /> {receta.tiempoMin} min
          </span>
          <span className="flex items-center gap-1">
            <Icono nombre="group" className="text-sm" /> {receta.raciones} rac.
          </span>
          <span className="flex items-center gap-1">
            <Icono nombre="signal_cellular_alt" className="text-sm" /> {receta.dificultad}
          </span>
        </div>
      </button>

      {faltan.length > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-secondary-fixed/40 border border-secondary/20">
          <p className="text-xs font-bold text-secondary flex items-center gap-1 mb-2">
            <Icono nombre="shopping_cart" className="text-sm" />
            {t('chef.faltantes')} ({faltan.length})
          </p>
          <ul className="flex flex-col gap-1">
            {faltan.map((ing, i) => (
              <li key={i} className="text-sm flex items-center gap-2">
                <Icono nombre="add_shopping_cart" className="text-secondary text-base shrink-0" />
                <span>
                  {ing.nombre}{' '}
                  <span className="text-on-surface-variant">
                    — {ing.cantidad} {ing.unidad}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {onAnadirFaltantes && (
            <button
              type="button"
              onClick={onAnadirFaltantes}
              disabled={anadidoCompra}
              className="cursor-pointer mt-2 w-full btn-secundario py-2 text-xs justify-center disabled:opacity-50"
            >
              <Icono nombre={anadidoCompra ? 'check' : 'playlist_add'} />
              {anadidoCompra ? t('chef.anadidoCompra') : t('chef.anadirFaltantes')}
            </button>
          )}
        </div>
      )}

      {faltan.length === 0 && expandida && (
        <p className="mt-3 text-xs text-primary font-semibold flex items-center gap-1">
          <Icono nombre="check_circle" className="text-sm" />
          {t('chef.todoEnDespensa')}
        </p>
      )}

      {expandida && (
        <div className="mt-3 pt-3 border-t border-outline-variant/50">
          <p className="text-xs font-bold text-on-surface-variant mb-2">{t('chef.ingredientes')}</p>
          <ul className="flex flex-col gap-1 mb-3">
            {receta.ingredientes.map((ing, i) => (
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
                  <span className="text-[10px] text-secondary font-semibold">{t('chef.falta')}</span>
                )}
              </li>
            ))}
          </ul>

          <p className="text-xs font-bold text-on-surface-variant mb-2">{t('chef.pasos')}</p>
          <ol className="flex flex-col gap-2 mb-4">
            {receta.pasos.map((p, i) => (
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
            onClick={onGuardar}
            disabled={guardada}
            className="btn-primario w-full justify-center disabled:opacity-50"
          >
            <Icono nombre={guardada ? 'check' : 'bookmark_add'} />
            {guardada ? t('chef.guardada') : t('chef.guardar')}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * CHEF IA — sugerencias automáticas y chat para recetas concretas (Groq vía API).
 */
export function PantallaChef() {
  const { t } = useTraduccion();
  const navigate = useNavigate();
  const despensa = useAppStore((s) => s.despensa);
  const catalogo = useAppStore((s) => s.ingredientes);
  const perfil = useAppStore((s) => s.perfil);
  const asegurarIngrediente = useAppStore((s) => s.asegurarIngrediente);
  const guardarReceta = useAppStore((s) => s.guardarReceta);
  const anadirItemManual = useAppStore((s) => s.anadirItemManual);

  const modo = useAuthStore((s) => s.modo);
  const token = useAuthStore((s) => s.token);

  const [vista, setVista] = useState<VistaChef>('sugerencias');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propuestas, setPropuestas] = useState<RecetaIA[] | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [guardadas, setGuardadas] = useState<Set<number>>(new Set());

  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [entradaChat, setEntradaChat] = useState('');
  const [recetaChatAbierta, setRecetaChatAbierta] = useState<string | null>(null);
  const [guardadasChat, setGuardadasChat] = useState<Set<string>>(new Set());
  const [compraAnadida, setCompraAnadida] = useState<Set<string>>(new Set());
  const finChatRef = useRef<HTMLDivElement>(null);

  const fichas = useMemo(() => new Map(catalogo.map((i) => [i.id, i])), [catalogo]);

  const despensaCompleta = useMemo(
    () =>
      despensa
        .map((i) => {
          const ficha = fichas.get(i.ingredienteId);
          return ficha
            ? { nombre: ficha.nombre, cantidad: i.cantidad, unidad: ficha.unidadBase }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [despensa, fichas],
  );

  const conStock = useMemo(
    () => despensaCompleta.filter((i) => i.cantidad > 0),
    [despensaCompleta],
  );

  const restricciones = useMemo(
    () => ({
      alergenos: [
        ...new Set(
          perfil.miembros.flatMap((m) => m.alergenos.map((a) => ETIQUETA_ALERGENO[a] ?? a)),
        ),
      ],
      preferencias: [
        ...new Set(
          perfil.miembros.flatMap((m) => m.preferencias.map((p) => ETIQUETA_PREFERENCIA[p] ?? p)),
        ),
      ],
      evitados: [...new Set(perfil.miembros.flatMap((m) => m.evitados))],
    }),
    [perfil.miembros],
  );

  useEffect(() => {
    if (vista === 'chat') {
      finChatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, cargando, vista]);

  const pedir = async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    setPropuestas(null);
    setGuardadas(new Set());
    try {
      const res = await pedirRecetasIA(token, {
        despensa: conStock,
        ...restricciones,
      });
      setPropuestas(res.recetas);
      setAbierta(res.recetas.length > 0 ? 0 : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron generar recetas');
    } finally {
      setCargando(false);
    }
  };

  const enviarChat = async (texto?: string) => {
    const mensaje = (texto ?? entradaChat).trim();
    if (!token || !mensaje || cargando) return;

    const idUsuario = nuevoId();
    setEntradaChat('');
    setError(null);
    setCargando(true);
    setMensajes((prev) => [...prev, { id: idUsuario, role: 'user', texto: mensaje }]);

    try {
      const historial = mensajes.map((m) => ({ role: m.role, content: m.texto }));
      const res = await chatChefIA(token, {
        mensaje,
        historial,
        despensa: despensaCompleta,
        ...restricciones,
      });

      const idAsistente = nuevoId();
      setMensajes((prev) => [
        ...prev,
        {
          id: idAsistente,
          role: 'assistant',
          texto: res.mensaje,
          receta: res.receta ?? undefined,
          faltantes: res.faltantes,
        },
      ]);
      if (res.receta) setRecetaChatAbierta(idAsistente);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo responder');
    } finally {
      setCargando(false);
    }
  };

  const guardar = (receta: RecetaIA, indice: number) => {
    const nueva = recetaIAaReceta(receta, asegurarIngrediente);
    guardarReceta(nueva);
    setGuardadas((prev) => new Set(prev).add(indice));
    void enriquecerCalorias(nueva, receta);
  };

  const guardarChat = (receta: RecetaIA, idMensaje: string) => {
    const nueva = recetaIAaReceta(receta, asegurarIngrediente);
    guardarReceta(nueva);
    setGuardadasChat((prev) => new Set(prev).add(idMensaje));
    void enriquecerCalorias(nueva, receta);
  };

  /** Estima calorías en segundo plano tras guardar (no bloquea la UI). */
  const enriquecerCalorias = async (guardada: Receta, origen: RecetaIA) => {
    if (!token) return;
    try {
      const res = await pedirCaloriasIA(token, {
        titulo: origen.titulo,
        raciones: origen.raciones,
        ingredientes: origen.ingredientes.map((i) => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          unidad: i.unidad,
        })),
      });
      guardarReceta({
        ...guardada,
        caloriasPorRacion: res.caloriasPorRacion,
        caloriasCalculadasEn: new Date().toISOString(),
      });
    } catch {
      // Silencioso: la receta ya está guardada; se pueden calcular luego en el detalle.
    }
  };

  const anadirFaltantesCompra = (faltantes: IngredienteFaltanteIA[], idMensaje: string) => {
    for (const ing of faltantes) {
      anadirItemManual(ing.nombre, ing.cantidad, aUnidad(ing.unidad));
    }
    setCompraAnadida((prev) => new Set(prev).add(idMensaje));
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
        subtitulo={
          vista === 'chat'
            ? t('chef.chatSub')
            : t('chef.subtitulo', { n: conStock.length })
        }
      />

      <div className="flex gap-2 mb-4">
        <Chip activo={vista === 'sugerencias'} onClick={() => setVista('sugerencias')}>
          {t('chef.sugerencias')}
        </Chip>
        <Chip activo={vista === 'chat'} onClick={() => setVista('chat')}>
          {t('chef.chat')}
        </Chip>
      </div>

      {error && (
        <p className="text-sm text-error bg-error-container/50 rounded-xl px-3 py-2 mb-4">{error}</p>
      )}

      {vista === 'sugerencias' ? (
        <>
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
              {t('chef.despensaVacia')}
            </p>
          )}

          {cargando && (
            <div className="tarjeta p-6 text-center text-on-surface-variant animate-pulse">
              <Icono nombre="skillet" className="text-4xl text-primary mb-2" />
              <p className="text-sm">{t('chef.mirando')}</p>
            </div>
          )}

          {propuestas && (
            <div className="flex flex-col gap-3">
              {propuestas.map((r, idx) => (
                <TarjetaRecetaChef
                  key={idx}
                  receta={r}
                  expandida={abierta === idx}
                  onToggle={() => setAbierta(abierta === idx ? null : idx)}
                  onGuardar={() => guardar(r, idx)}
                  guardada={guardadas.has(idx)}
                  t={t}
                />
              ))}

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
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 min-h-[12rem] max-h-[55vh] overflow-y-auto pb-2">
            {mensajes.length === 0 && !cargando && (
              <div className="tarjeta p-5 text-center text-on-surface-variant">
                <Icono nombre="chat" className="text-4xl text-primary mb-2" />
                <p className="text-sm">{t('chef.chatVacio')}</p>
              </div>
            )}

            {mensajes.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-on-primary rounded-br-md'
                      : 'bg-surface-container-low border border-outline-variant/50 rounded-bl-md'
                  }`}
                >
                  {msg.texto}
                </div>

                {msg.receta && (
                  <div className="w-full">
                    <TarjetaRecetaChef
                      receta={msg.receta}
                      expandida={recetaChatAbierta === msg.id}
                      onToggle={() =>
                        setRecetaChatAbierta(recetaChatAbierta === msg.id ? null : msg.id)
                      }
                      onGuardar={() => guardarChat(msg.receta!, msg.id)}
                      guardada={guardadasChat.has(msg.id)}
                      faltantes={msg.faltantes}
                      onAnadirFaltantes={
                        msg.faltantes && msg.faltantes.length > 0
                          ? () => anadirFaltantesCompra(msg.faltantes!, msg.id)
                          : undefined
                      }
                      anadidoCompra={compraAnadida.has(msg.id)}
                      t={t}
                    />
                  </div>
                )}
              </div>
            ))}

            {cargando && (
              <div className="flex items-start gap-2">
                <div className="bg-surface-container-low border border-outline-variant/50 rounded-2xl rounded-bl-md px-4 py-3 animate-pulse">
                  <Icono nombre="skillet" className="text-primary" />
                </div>
              </div>
            )}
            <div ref={finChatRef} />
          </div>

          {mensajes.length === 0 && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
              {[t('chef.sugerenciaPaella'), t('chef.sugerenciaLasaña'), t('chef.sugerenciaTortilla')].map(
                (sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => void enviarChat(sug)}
                    disabled={cargando}
                    className="cursor-pointer shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-low border border-outline-variant/60 hover:border-primary-fixed-dim transition-colors"
                  >
                    {sug}
                  </button>
                ),
              )}
            </div>
          )}

          <form
            className="flex gap-2 sticky bottom-20 md:bottom-4 bg-surface pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              void enviarChat();
            }}
          >
            <input
              value={entradaChat}
              onChange={(e) => setEntradaChat(e.target.value)}
              placeholder={t('chef.chatPlaceholder')}
              disabled={cargando}
              className="flex-1 campo text-sm"
            />
            <button
              type="submit"
              disabled={cargando || !entradaChat.trim()}
              aria-label={t('chef.chatEnviar')}
              className="cursor-pointer btn-primario w-11 h-11 p-0 rounded-xl shrink-0 disabled:opacity-40"
            >
              <Icono nombre="send" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
