import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { filtrarRecetas, type FiltrosReceta } from '../services/recetas';
import { TarjetaReceta } from '../components/TarjetaReceta';
import { Chip } from '../components/Chip';
import { Icono } from '../components/Icono';
import { EncabezadoPagina } from '../components/EncabezadoPagina';

const ETIQUETAS_RAPIDAS = ['vegetariano', 'vegano', 'sin gluten', 'saludable', 'postre', 'casero'];

export function PantallaExplorador() {
  const recetas = useAppStore((s) => s.recetas);
  const despensa = useAppStore((s) => s.despensa);

  const [texto, setTexto] = useState('');
  const [soloFavoritas, setSoloFavoritas] = useState(false);
  const [conLoQueTengo, setConLoQueTengo] = useState(false);
  const [etiqueta, setEtiqueta] = useState<string | undefined>();
  const [soloRapidas, setSoloRapidas] = useState(false);

  const visibles = useMemo(() => {
    const filtros: FiltrosReceta = {
      texto,
      soloFavoritas,
      conLoQueTengo,
      etiqueta,
      tiempoMaxMin: soloRapidas ? 30 : undefined,
    };
    return filtrarRecetas(recetas, filtros, despensa);
  }, [recetas, despensa, texto, soloFavoritas, conLoQueTengo, etiqueta, soloRapidas]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Explorar recetas"
        subtitulo="Busca inspiración con lo que ya tienes en la nevera."
      />

      <label className="campo-busqueda mb-5 block">
        <Icono nombre="search" className="text-on-surface-variant shrink-0" />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pasta, curry, tarta de manzana…"
          className="bg-transparent outline-none w-full text-on-surface placeholder:text-on-surface-variant/80"
        />
      </label>

      <Link
        to="/chef"
        className="tarjeta p-4 mb-4 flex items-center gap-3 hover:border-primary-fixed-dim transition-colors cursor-pointer bg-primary-fixed/30"
      >
        <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
          <Icono nombre="auto_awesome" className="text-primary text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-on-surface">Chef IA · ¿Qué cocino hoy?</p>
          <p className="text-xs text-on-surface-variant">
            La IA inventa recetas con lo que hay en tu despensa
          </p>
        </div>
        <Icono nombre="chevron_right" className="text-on-surface-variant" />
      </Link>

      <div className="tarjeta p-4 mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
            <Icono nombre="kitchen" className="text-primary text-xl" />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">Con lo que tengo</p>
            <p className="text-xs text-on-surface-variant">Solo recetas que puedes hacer ya</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={conLoQueTengo}
          data-on={conLoQueTengo}
          onClick={() => setConLoQueTengo((v) => !v)}
          className="toggle-cocina"
        >
          <span />
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
        <Chip
          activo={!soloFavoritas && !etiqueta && !soloRapidas}
          onClick={() => {
            setSoloFavoritas(false);
            setEtiqueta(undefined);
            setSoloRapidas(false);
          }}
        >
          Todas
        </Chip>
        <Chip activo={soloFavoritas} onClick={() => setSoloFavoritas((v) => !v)}>
          Favoritas
        </Chip>
        <Chip activo={soloRapidas} onClick={() => setSoloRapidas((v) => !v)}>
          Rápidas (&lt;30 min)
        </Chip>
        {ETIQUETAS_RAPIDAS.map((e) => (
          <Chip key={e} activo={etiqueta === e} onClick={() => setEtiqueta(etiqueta === e ? undefined : e)}>
            {e}
          </Chip>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="tarjeta text-center py-16 px-6 text-on-surface-variant">
          <Icono nombre="soup_kitchen" className="text-5xl mb-3 text-primary/60" />
          <p className="font-serif text-lg text-on-surface mb-1">Nada por aquí</p>
          <p className="text-sm">Prueba otro filtro o relaja la búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibles.map((receta) => (
            <TarjetaReceta key={receta.id} receta={receta} />
          ))}
        </div>
      )}
    </div>
  );
}
