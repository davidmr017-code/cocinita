/**
 * Icono de Material Symbols (fuente variable), el set usado por el diseño
 * Stitch. `relleno` activa la variante FILL para estados activos.
 */
interface IconoProps {
  nombre: string;
  relleno?: boolean;
  className?: string;
}

export function Icono({ nombre, relleno = false, className = '' }: IconoProps) {
  return (
    <span className={`ms ${relleno ? 'ms-fill' : ''} ${className}`} aria-hidden="true">
      {nombre}
    </span>
  );
}
