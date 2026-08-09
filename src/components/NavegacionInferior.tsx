import { NavLink } from 'react-router-dom';
import { Icono } from './Icono';

const PESTANAS = [
  { ruta: '/', icono: 'explore', etiqueta: 'Explorar' },
  { ruta: '/recetas', icono: 'menu_book', etiqueta: 'Recetas' },
  { ruta: '/despensa', icono: 'kitchen', etiqueta: 'Despensa' },
  { ruta: '/compra', icono: 'shopping_cart', etiqueta: 'Compra' },
  { ruta: '/menu', icono: 'calendar_month', etiqueta: 'Menú' },
] as const;

export function NavegacionInferior() {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 nav-flotante sombra-cocina-arriba">
      <div className="flex justify-around items-stretch px-1 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] max-w-[1280px] mx-auto">
        {PESTANAS.map(({ ruta, icono, etiqueta }) => (
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
