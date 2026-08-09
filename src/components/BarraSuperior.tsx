import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { recetaAleatoria } from '../services/recetas';
import { IMAGENES } from '../data/seed';
import { Icono } from './Icono';

const SALUDOS = [
  '¿Qué cocinamos hoy?',
  'Tu cocina, tu ritmo',
  'Ingredientes listos, ánimo también',
];

function saludoDelDia() {
  return SALUDOS[new Date().getDate() % SALUDOS.length];
}

export function BarraSuperior() {
  const navegar = useNavigate();
  const recetas = useAppStore((s) => s.recetas);

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
          aria-label="Ir al perfil del hogar"
        >
          <img
            src={IMAGENES.avatar}
            alt="Mi avatar"
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-outline-variant group-hover:ring-primary-fixed-dim transition-all"
          />
          <div className="text-left min-w-0 hidden sm:block">
            <p className="font-serif font-semibold text-lg text-primary leading-tight tracking-tight">
              Cocinita
            </p>
            <p className="text-[11px] text-on-surface-variant truncate max-w-[11rem]">
              {saludoDelDia()}
            </p>
          </div>
          <p className="font-serif font-semibold text-xl text-primary sm:hidden">Cocinita</p>
        </button>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={sorprenderme}
            aria-label="Receta aleatoria"
            title="Sorpréndeme con una receta"
            className="btn-icono"
          >
            <Icono nombre="casino" className="text-[1.35rem]" />
          </button>
          <button
            type="button"
            onClick={() => navegar('/amigos')}
            aria-label="Amigos"
            className="btn-icono"
          >
            <Icono nombre="group" className="text-[1.35rem]" />
          </button>
          <button
            type="button"
            onClick={() => navegar('/escanear')}
            aria-label="Escanear producto"
            className="btn-icono"
          >
            <Icono nombre="barcode_scanner" className="text-[1.35rem]" />
          </button>
          <button
            type="button"
            onClick={() => navegar('/ajustes')}
            aria-label="Ajustes"
            className="btn-icono"
          >
            <Icono nombre="settings" className="text-[1.35rem]" />
          </button>
        </div>
      </div>
    </header>
  );
}
