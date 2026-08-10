import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTraduccion } from '../i18n/useTraduccion';
import { useAuthStore } from '../store/useAuthStore';
import { Icono } from './Icono';

type Paso = {
  id: string;
  icono: string;
  acento: 'primario' | 'secundario';
  titulo: string;
  texto: string;
  puntos: string[];
  /** Ruta a la que saltar al terminar (solo en el último paso). */
  ruta?: string;
};

/**
 * Tutorial por pasos que se muestra al crear un hogar, unirse a uno
 * existente o empezar en modo local.
 */
export function TutorialInicial() {
  const { t } = useTraduccion();
  const navegar = useNavigate();

  const modo = useAuthStore((s) => s.modo);
  const hogar = useAuthStore((s) => s.hogar);
  const hogarRecienCreado = useAuthStore((s) => s.hogarRecienCreado);
  const cerrarTutorial = useAuthStore((s) => s.cerrarTutorial);

  const [indice, setIndice] = useState(0);

  const esLocal = modo !== 'familia';

  const pasoHogar = esLocal
    ? {
        titulo: t('tutorial.localTitulo'),
        texto: t('tutorial.localTexto'),
        puntos: [t('tutorial.localP1'), t('tutorial.localP2')],
      }
    : {
        titulo: hogarRecienCreado ? t('tutorial.hogarTitulo') : t('tutorial.unirseTitulo'),
        texto: hogarRecienCreado ? t('tutorial.hogarTexto') : t('tutorial.unirseTexto'),
        puntos: [t('tutorial.hogarP1'), t('tutorial.hogarP2')],
      };

  const pasos: Paso[] = [
    {
      id: 'bienvenida',
      icono: 'celebration',
      acento: 'primario',
      titulo: t('tutorial.bienvenidaTitulo'),
      texto: t('tutorial.bienvenidaTexto'),
      puntos: [],
    },
    {
      id: 'hogar',
      icono: esLocal ? 'phone_iphone' : 'family_restroom',
      acento: 'secundario',
      ...pasoHogar,
    },
    {
      id: 'despensa',
      icono: 'kitchen',
      acento: 'primario',
      titulo: t('tutorial.despensaTitulo'),
      texto: t('tutorial.despensaTexto'),
      puntos: [t('tutorial.despensaP1'), t('tutorial.despensaP2')],
    },
    {
      id: 'recetas',
      icono: 'menu_book',
      acento: 'secundario',
      titulo: t('tutorial.recetasTitulo'),
      texto: t('tutorial.recetasTexto'),
      puntos: [t('tutorial.recetasP1'), t('tutorial.recetasP2')],
    },
    {
      id: 'chef',
      icono: 'auto_awesome',
      acento: 'primario',
      titulo: t('tutorial.chefTitulo'),
      texto: t('tutorial.chefTexto'),
      puntos: [t('tutorial.chefP1'), t('tutorial.chefP2')],
    },
    {
      id: 'compra',
      icono: 'shopping_cart',
      acento: 'secundario',
      titulo: t('tutorial.compraTitulo'),
      texto: t('tutorial.compraTexto'),
      puntos: [t('tutorial.compraP1'), t('tutorial.compraP2')],
    },
    {
      id: 'planifica',
      icono: 'calendar_month',
      acento: 'primario',
      titulo: t('tutorial.planificaTitulo'),
      texto: t('tutorial.planificaTexto'),
      puntos: [t('tutorial.planificaP1'), t('tutorial.planificaP2')],
    },
    {
      id: 'listo',
      icono: 'restaurant',
      acento: 'secundario',
      titulo: t('tutorial.listoTitulo'),
      texto: t('tutorial.listoTexto'),
      puntos: [],
      ruta: '/despensa',
    },
  ];

  const total = pasos.length;
  const paso = pasos[indice];
  const esUltimo = indice === total - 1;

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarTutorial();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [cerrarTutorial]);

  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  const terminar = () => {
    if (paso.ruta) navegar(paso.ruta);
    cerrarTutorial();
  };

  const siguiente = () => {
    if (esUltimo) terminar();
    else setIndice((i) => Math.min(total - 1, i + 1));
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t('tutorial.titulo')}
    >
      <div className="bg-surface w-full sm:max-w-md max-h-[92vh] rounded-t-3xl sm:rounded-3xl sombra-cocina flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
              {t('tutorial.titulo')}
            </p>
            <p className="text-xs text-on-surface-variant">
              {t('tutorial.pasoDe', { n: indice + 1, total })}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrarTutorial}
            className="btn-icono shrink-0"
            aria-label={t('tutorial.saltar')}
          >
            <Icono nombre="close" />
          </button>
        </div>

        <div className="px-5" aria-hidden="true">
          <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((indice + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div
            key={paso.id}
            className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 ${
              paso.acento === 'primario'
                ? 'bg-primary-fixed text-primary'
                : 'bg-secondary-fixed text-secondary'
            }`}
          >
            <Icono nombre={paso.icono} className="text-4xl" />
          </div>

          <h2 className="font-serif font-extrabold text-2xl leading-tight tracking-tight">
            {paso.titulo}
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{paso.texto}</p>

          {paso.id === 'hogar' && !esLocal && hogar?.codigo && (
            <div className="mt-4 rounded-2xl border border-primary/25 bg-primary-fixed/50 px-4 py-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-on-primary-fixed-variant">
                {t('tutorial.codigoHogar')}
              </p>
              <p className="font-serif font-extrabold text-2xl tracking-widest text-primary mt-0.5">
                {hogar.codigo}
              </p>
            </div>
          )}

          {paso.puntos.length > 0 && (
            <ul className="flex flex-col gap-2.5 mt-5">
              {paso.puntos.map((punto) => (
                <li key={punto} className="flex items-start gap-2.5 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
                    <Icono nombre="check" className="text-base text-primary" />
                  </span>
                  <span className="text-on-surface-variant">{punto}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 border-t border-outline-variant/60 flex flex-col gap-2">
          <div className="flex gap-2">
            {indice > 0 && (
              <button
                type="button"
                onClick={() => setIndice((i) => Math.max(0, i - 1))}
                className="btn-secundario flex-1 justify-center"
              >
                <Icono nombre="arrow_back" /> {t('tutorial.atras')}
              </button>
            )}
            <button
              type="button"
              onClick={siguiente}
              autoFocus
              className="btn-primario flex-[2] justify-center"
            >
              {esUltimo ? (
                <>
                  <Icono nombre="skillet" /> {t('tutorial.empezar')}
                </>
              ) : (
                <>
                  {t('tutorial.siguiente')} <Icono nombre="arrow_forward" />
                </>
              )}
            </button>
          </div>

          {!esUltimo && (
            <button
              type="button"
              onClick={cerrarTutorial}
              className="cursor-pointer text-xs font-semibold text-on-surface-variant hover:text-primary py-1"
            >
              {t('tutorial.saltar')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
