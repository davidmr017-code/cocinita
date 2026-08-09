import type { ReactNode } from 'react';

interface ChipProps {
  activo?: boolean;
  onClick?: () => void;
  children: ReactNode;
  icono?: string;
}

export function Chip({ activo = false, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
        activo
          ? 'bg-primary text-on-primary shadow-[0_2px_8px_-2px_rgba(63,92,62,0.35)]'
          : 'bg-surface-container-lowest text-on-surface border border-outline-variant hover:border-primary-fixed-dim hover:bg-surface-container-low'
      }`}
    >
      {children}
    </button>
  );
}
