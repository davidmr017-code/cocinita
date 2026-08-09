import { NavLink } from 'react-router-dom';

import { useTraduccion } from '../i18n/useTraduccion';
import { Icono } from './Icono';

export function NavegacionInferior() {
  const { t } = useTraduccion();

  const pestanas = [
    { ruta: '/', icono: 'explore', etiqueta: t('nav.explorar') },
    { ruta: '/recetas', icono: 'menu_book', etiqueta: t('nav.recetas') },
    { ruta: '/despensa', icono: 'kitchen', etiqueta: t('nav.despensa') },
    { ruta: '/compra', icono: 'shopping_cart', etiqueta: t('nav.compra') },
    { ruta: '/gastos', icono: 'receipt_long', etiqueta: t('nav.gastos') },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 nav-flotante sombra-cocina-arriba">
      <div className="flex justify-around items-stretch px-1 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] max-w-[1280px] mx-auto">
        {pestanas.map(({ ruta, icono, etiqueta }) => (
          <NavLink
            key={ruta}
            to={ruta}
            end={ruta === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1.5 mx-0.5 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary-fixed text-on-primary-fixed-variant'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icono nombre={icono} relleno={isActive} className="text-[1.4rem]" />
                <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {etiqueta}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
