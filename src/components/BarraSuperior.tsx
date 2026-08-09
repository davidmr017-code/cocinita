import { useNavigate } from 'react-router-dom';

import { IMAGENES } from '../data/seed';
import { useTraduccion } from '../i18n/useTraduccion';
import { recetaAleatoria } from '../services/recetas';
import { useAppStore } from '../store/useAppStore';
import { Icono } from './Icono';

export function BarraSuperior() {
  const navegar = useNavigate();
  const recetas = useAppStore((s) => s.recetas);
  const { t } = useTraduccion();

  const saludos = [t('barra.saludo1'), t('barra.saludo2'), t('barra.saludo3')];
  const saludo = saludos[new Date().getDate() % saludos.length];

  const sorprenderme = () => {
    const receta = recetaAleatoria(recetas);
    if (receta) navegar(`/receta/${receta.id}`);
  };

  return (
    <header className="barra-cocina w-full top-0 sticky z-40">
      <div className="flex items-center justify-between px-4 md:px-10 h-[4.25rem] w-full max-w-[1280px] mx-auto">
        <button
          type="button"
          onClick={() => navegar('/perfil')}
          className="flex items-center gap-3 cursor-pointer group min-w-0"
          aria-label={t('barra.irPerfil')}
        >
          <img
            src={IMAGENES.avatar}
            alt={t('barra.miAvatar')}
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-outline-variant group-hover:ring-primary-fixed-dim transition-all"
          />
          <div className="text-left min-w-0 hidden sm:block">
            <p className="font-serif font-semibold text-lg text-primary leading-tight tracking-tight">
              Cocinita
            </p>
            <p className="text-[11px] text-on-surface-variant truncate max-w-[11rem]">{saludo}</p>
          </div>
          <p className="font-serif font-semibold text-xl text-primary sm:hidden">Cocinita</p>
        </button>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={sorprenderme}
            aria-label={t('barra.recetaAleatoria')}
            title={t('barra.sorprendeme')}
            className="btn-icono"
          >
            <Icono nombre="casino" className="text-[1.35rem]" />
          </button>
          <button
            type="button"
            onClick={() => navegar('/menu')}
            aria-label={t('barra.menuSemanal')}
            className="btn-icono"
          >
            <Icono nombre="calendar_month" className="text-[1.35rem]" />
          </button>
          <button
            type="button"
            onClick={() => navegar('/amigos')}
            aria-label={t('barra.amigos')}
            className="btn-icono"
          >
            <Icono nombre="group" className="text-[1.35rem]" />
          </button>
          <button
            type="button"
            onClick={() => navegar('/escanear')}
            aria-label={t('barra.escanear')}
            className="btn-icono"
          >
            <Icono nombre="barcode_scanner" className="text-[1.35rem]" />
          </button>
          <button
            type="button"
            onClick={() => navegar('/ajustes')}
            aria-label={t('barra.ajustes')}
            className="btn-icono"
          >
            <Icono nombre="settings" className="text-[1.35rem]" />
          </button>
        </div>
      </div>
    </header>
  );
}
