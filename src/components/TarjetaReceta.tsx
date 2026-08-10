import { Link } from 'react-router-dom';
import type { Receta } from '../domain/tipos';
import { useAppStore } from '../store/useAppStore';
import { Icono } from './Icono';

export const DIFICULTAD_LEGIBLE: Record<Receta['dificultad'], string> = {
  facil: 'Fácil',
  media: 'Media',
  dificil: 'Con calma',
};

interface TarjetaRecetaProps {
  receta: Receta;
  extra?: React.ReactNode;
}

export function TarjetaReceta({ receta, extra }: TarjetaRecetaProps) {
  const alternarFavorita = useAppStore((s) => s.alternarFavorita);

  return (
    <article className="tarjeta tarjeta-interactiva overflow-hidden group">
      <div className="relative">
        <Link to={`/receta/${receta.id}`} aria-label={`Ver ${receta.titulo}`}>
          <div
            className="h-48 bg-surface-container bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.02]"
            style={receta.imagen ? { backgroundImage: `url('${receta.imagen}')` } : undefined}
            role="img"
            aria-label={receta.titulo}
          />
        </Link>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(44,41,38,0.35)] to-transparent pointer-events-none" />

        <button
          type="button"
          onClick={() => alternarFavorita(receta.id)}
          aria-label={receta.favorita ? 'Quitar de favoritas' : 'Marcar como favorita'}
          className="cursor-pointer absolute top-3 right-3 w-9 h-9 rounded-xl bg-surface/90 backdrop-blur-sm border border-outline-variant/50 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Icono
            nombre="favorite"
            relleno={receta.favorita}
            className={`text-lg ${receta.favorita ? 'text-secondary' : 'text-on-surface-variant'}`}
          />
        </button>

        {receta.origen === 'amigo' && (
          <span className="absolute bottom-3 left-3 etiqueta etiqueta-terracota">
            De {receta.autor}
          </span>
        )}
      </div>

      <div className="p-4 pt-3">
        <div className="flex gap-1.5 mb-2.5 flex-wrap">
          {receta.etiquetas.slice(0, 3).map((etiqueta) => (
            <span key={etiqueta} className="etiqueta etiqueta-salvia">
              {etiqueta}
            </span>
          ))}
          {!receta.aprendida && (
            <span className="etiqueta etiqueta-terracota">Por aprender</span>
          )}
        </div>

        <Link to={`/receta/${receta.id}`} className="cursor-pointer block">
          <h3 className="font-serif font-semibold text-[1.15rem] text-on-surface leading-snug group-hover:text-primary transition-colors">
            {receta.titulo}
          </h3>
        </Link>

        <div className="flex items-center gap-3 mt-2.5 text-on-surface-variant text-sm">
          <span className="flex items-center gap-1">
            <Icono nombre="schedule" className="text-[0.95rem]" /> {receta.tiempoMin} min
          </span>
          <span className="w-1 h-1 rounded-full bg-outline-variant" aria-hidden />
          <span>{DIFICULTAD_LEGIBLE[receta.dificultad]}</span>
          {receta.caloriasPorRacion != null && (
            <>
              <span className="w-1 h-1 rounded-full bg-outline-variant" aria-hidden />
              <span className="flex items-center gap-1">
                <Icono nombre="local_fire_department" className="text-[0.95rem]" />
                {receta.caloriasPorRacion} kcal
              </span>
            </>
          )}
          {receta.videoUrl && (
            <>
              <span className="w-1 h-1 rounded-full bg-outline-variant" aria-hidden />
              <span className="flex items-center gap-1 text-secondary">
                <Icono nombre="play_circle" className="text-[0.95rem]" /> Vídeo
              </span>
            </>
          )}
        </div>

        {extra && <div className="mt-3 pt-3 border-t border-outline-variant/60">{extra}</div>}
      </div>
    </article>
  );
}
