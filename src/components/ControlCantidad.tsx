import { Icono } from './Icono';

interface ControlCantidadProps {
  valor: string | number;
  onRestar: () => void;
  onSumar: () => void;
  ariaLabel?: string;
}

export function ControlCantidad({ valor, onRestar, onSumar, ariaLabel }: ControlCantidadProps) {
  return (
    <div
      className="flex items-center gap-1 bg-surface-container border border-outline-variant rounded-xl px-1.5 py-1"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={onRestar}
        aria-label="Restar"
        className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
      >
        <Icono nombre="remove" className="text-base" />
      </button>
      <span className="text-sm font-bold text-on-surface min-w-9 text-center tabular-nums px-0.5">
        {valor}
      </span>
      <button
        type="button"
        onClick={onSumar}
        aria-label="Sumar"
        className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
      >
        <Icono nombre="add" className="text-base" />
      </button>
    </div>
  );
}
