import { useEffect, useRef, useState, type ReactNode } from 'react';

type Direccion = 'abajo' | 'izquierda' | 'derecha' | 'zoom';

interface RevelarAlScrollProps {
  children: ReactNode;
  /** Retardo en ms para escalonar varios elementos de la misma sección. */
  retardo?: number;
  direccion?: Direccion;
  className?: string;
  /** Etiqueta a renderizar (por defecto div). */
  como?: 'div' | 'section' | 'li' | 'article';
}

const CLASE_DIRECCION: Record<Direccion, string> = {
  abajo: '',
  izquierda: 'revelar-izquierda',
  derecha: 'revelar-derecha',
  zoom: 'revelar-zoom',
};

/**
 * Muestra su contenido con una transición cuando entra en el viewport.
 * Usa IntersectionObserver una sola vez por elemento (no revierte al salir).
 */
export function RevelarAlScroll({
  children,
  retardo = 0,
  direccion = 'abajo',
  className = '',
  como: Etiqueta = 'div',
}: RevelarAlScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setVisible(true);
            observador.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );

    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return (
    <Etiqueta
      ref={ref as never}
      data-visible={visible}
      style={retardo ? { transitionDelay: `${retardo}ms` } : undefined}
      className={`revelar ${CLASE_DIRECCION[direccion]} ${className}`}
    >
      {children}
    </Etiqueta>
  );
}
