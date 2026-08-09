import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { TipoComida } from '../domain/tipos';
import { aFechaISO, diasDeLaSemana } from '../domain/utilidades';
import { useAppStore, hoyISO } from '../store/useAppStore';
import { Icono } from '../components/Icono';
import { useTraduccion } from '../i18n/useTraduccion';
import { EncabezadoPagina } from '../components/EncabezadoPagina';

function formateadores(locale: string) {
  return {
    dia: new Intl.DateTimeFormat(locale, { weekday: 'long' }),
    corto: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
  };
}

/**
 * PLANIFICADOR SEMANAL:
 *  - Arrastra recetas desde la bandeja superior a cualquier día
 *    (comida o cena). También se pueden mover entradas entre días.
 *  - En móvil, donde no hay drag&drop cómodo, basta con tocar una receta
 *    para "cogerla" y tocar la casilla de destino.
 *  - "Generar lista global" cruza TODO el menú con la despensa de una vez.
 */
export function PantallaMenuSemanal() {
  const { t, locale } = useTraduccion();
  const navegar = useNavigate();
  const recetas = useAppStore((s) => s.recetas);
  const menu = useAppStore((s) => s.menu);
  const anadirAlMenu = useAppStore((s) => s.anadirAlMenu);
  const quitarDelMenu = useAppStore((s) => s.quitarDelMenu);
  const moverEntradaMenu = useAppStore((s) => s.moverEntradaMenu);
  const generarListaDesdeMenu = useAppStore((s) => s.generarListaDesdeMenu);

  /** Receta "cogida" con un toque (alternativa táctil al drag&drop). */
  const [recetaEnMano, setRecetaEnMano] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const dias = useMemo(() => diasDeLaSemana(), []);
  const titulos = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);
  const fmt = useMemo(() => formateadores(locale), [locale]);

  /** Entradas del menú para una casilla concreta (día + comida). */
  const entradasDe = (fecha: string, comida: TipoComida) =>
    menu.filter((e) => e.fecha === fecha && e.comida === comida);

  /** Suelta lo que se esté arrastrando (receta nueva o entrada existente). */
  const alSoltar = (evento: React.DragEvent, fecha: string, comida: TipoComida) => {
    evento.preventDefault();
    const entradaId = evento.dataTransfer.getData('entradaId');
    const recetaId = evento.dataTransfer.getData('recetaId');
    if (entradaId) {
      moverEntradaMenu(entradaId, fecha, comida);
    } else if (recetaId) {
      const receta = titulos.get(recetaId);
      anadirAlMenu(fecha, comida, recetaId, receta?.raciones ?? 2);
    }
  };

  /** Alternativa táctil: receta en mano + toque en la casilla. */
  const alTocarCasilla = (fecha: string, comida: TipoComida) => {
    if (!recetaEnMano) return;
    const receta = titulos.get(recetaEnMano);
    anadirAlMenu(fecha, comida, recetaEnMano, receta?.raciones ?? 2);
    setRecetaEnMano(null);
  };

  const generarLista = () => {
    const cuantos = generarListaDesdeMenu();
    setAviso(
      cuantos > 0
        ? `Lista global generada: faltan ${cuantos} ingredientes`
        : '¡Tienes todo lo del menú en casa!',
    );
    setTimeout(() => {
      setAviso(null);
      navegar('/compra');
    }, 1200);
  };

  return (
    <div>
      <EncabezadoPagina
        titulo={t('menu.titulo')}
        subtitulo={t('menu.subtitulo')}
        accion={
          <button
            type="button"
            onClick={generarLista}
            disabled={menu.length === 0}
            className="btn-primario disabled:opacity-40"
          >
            <Icono nombre="shopping_cart" /> {t('menu.listaGlobal')}
          </button>
        }
      />

      {/* Bandeja de recetas arrastrables */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-on-surface-variant mb-2">
          {t('menu.tusRecetas')} {recetaEnMano && '· …'}
        </h3>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
          {recetas.map((receta) => (
            <button
              key={receta.id}
              type="button"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('recetaId', receta.id)}
              onClick={() => setRecetaEnMano(recetaEnMano === receta.id ? null : receta.id)}
              className={`cursor-grab active:cursor-grabbing shrink-0 flex items-center gap-2 pr-4 pl-1 py-1 rounded-xl border text-sm font-semibold transition-colors ${
                recetaEnMano === receta.id
                  ? 'bg-primary-container text-on-primary-container border-primary-container'
                  : 'bg-surface-container-lowest border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              <span
                className="w-9 h-9 rounded-full bg-surface-container bg-cover bg-center"
                style={receta.imagen ? { backgroundImage: `url('${receta.imagen}')` } : undefined}
              />
              {receta.titulo}
            </button>
          ))}
        </div>
      </div>

      {/* Rejilla de la semana */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {dias.map((dia) => {
          const fecha = aFechaISO(dia);
          const esHoy = fecha === hoyISO();
          return (
            <div
              key={fecha}
              className={`rounded-xl p-3 border ${esHoy ? 'tarjeta bg-primary-fixed/30 border-primary-fixed-dim' : 'bg-surface-container-low border-transparent'}`}
            >
              <p className="text-sm font-bold capitalize">
                {fmt.dia.format(dia)}{' '}
                <span className="font-normal text-on-surface-variant text-xs">
                  {fmt.corto.format(dia)}
                </span>
                {esHoy && (
                  <span className="ml-1 etiqueta etiqueta-salvia py-0 px-1.5 text-[10px]">
                    {t('menu.hoy')}
                  </span>
                )}
              </p>

              {(['comida', 'cena'] as const).map((comida) => (
                <div
                  key={comida}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => alSoltar(e, fecha, comida)}
                  onClick={() => alTocarCasilla(fecha, comida)}
                  className={`mt-2 min-h-16 rounded-lg border border-dashed p-2 transition-colors ${
                    recetaEnMano
                      ? 'border-primary bg-primary-fixed/20 cursor-pointer'
                      : 'border-outline-variant'
                  }`}
                >
                  <p className="text-[11px] font-semibold text-on-surface-variant mb-1 capitalize">
                    {comida === 'comida' ? t('menu.comida') : t('menu.cena')}
                  </p>
                  {entradasDe(fecha, comida).map((entrada) => {
                    const receta = titulos.get(entrada.recetaId);
                    if (!receta) return null;
                    return (
                      <div
                        key={entrada.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('entradaId', entrada.id)}
                        className="cursor-grab active:cursor-grabbing tarjeta p-2 mb-1 flex items-center gap-2"
                      >
                        <span
                          className="w-8 h-8 rounded-md bg-surface-container bg-cover bg-center shrink-0"
                          style={receta.imagen ? { backgroundImage: `url('${receta.imagen}')` } : undefined}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{receta.titulo}</p>
                          <p className="text-[10px] text-on-surface-variant">
                            {entrada.raciones} raciones
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            quitarDelMenu(entrada.id);
                          }}
                          aria-label="Quitar del menú"
                          className="cursor-pointer text-outline hover:text-error transition-colors"
                        >
                          <Icono nombre="close" className="text-sm" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {aviso && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl text-sm z-50 sombra-cocina">
          {aviso}
        </div>
      )}
    </div>
  );
}
