import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useTraduccion } from '../i18n/useTraduccion';
import { TarjetaReceta } from '../components/TarjetaReceta';
import { Chip } from '../components/Chip';
import { Icono } from '../components/Icono';
import { EncabezadoPagina } from '../components/EncabezadoPagina';

type Coleccion = 'todas' | 'mias' | 'porAprender' | 'deAmigos' | 'favoritas';

export function PantallaMisRecetas() {
  const { t } = useTraduccion();
  const recetas = useAppStore((s) => s.recetas);
  const [coleccion, setColeccion] = useState<Coleccion>('todas');

  const visibles = useMemo(() => {
    switch (coleccion) {
      case 'mias':
        return recetas.filter((r) => r.origen === 'propia');
      case 'porAprender':
        return recetas.filter((r) => !r.aprendida);
      case 'deAmigos':
        return recetas.filter((r) => r.origen === 'amigo');
      case 'favoritas':
        return recetas.filter((r) => r.favorita);
      default:
        return recetas;
    }
  }, [recetas, coleccion]);

  const OPCIONES: { id: Coleccion; etiqueta: string }[] = [
    { id: 'todas', etiqueta: t('recetas.todas') },
    { id: 'mias', etiqueta: t('recetas.mias') },
    { id: 'porAprender', etiqueta: t('recetas.porAprender') },
    { id: 'deAmigos', etiqueta: t('recetas.deAmigos') },
    { id: 'favoritas', etiqueta: t('recetas.favoritas') },
  ];

  return (
    <div>
      <EncabezadoPagina
        titulo={t('recetas.titulo')}
        subtitulo={t('recetas.subtitulo')}
        accion={
          <div className="hidden md:flex gap-2">
            <Link to="/receta/importar" className="btn-secundario">
              <Icono nombre="movie" /> {t('recetas.importar')}
            </Link>
            <Link to="/receta/nueva" className="btn-primario">
              <Icono nombre="add" /> {t('recetas.nueva')}
            </Link>
          </div>
        }
      />

      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
        {OPCIONES.map((o) => (
          <Chip key={o.id} activo={coleccion === o.id} onClick={() => setColeccion(o.id)}>
            {o.etiqueta}
          </Chip>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="tarjeta text-center py-16 px-6 text-on-surface-variant">
          <Icono nombre="menu_book" className="text-5xl mb-3 text-primary/60" />
          <p className="font-serif text-lg text-on-surface mb-1">{t('recetas.vacioTitulo')}</p>
          <p className="text-sm">{t('recetas.vacioSub')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibles.map((receta) => (
            <TarjetaReceta key={receta.id} receta={receta} />
          ))}
        </div>
      )}

      <Link
        to="/receta/nueva"
        aria-label={t('recetas.nueva')}
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-primary text-on-primary rounded-2xl sombra-cocina flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Icono nombre="add" className="text-2xl" />
      </Link>
    </div>
  );
}
