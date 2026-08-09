import type { ReactNode } from 'react';

interface EncabezadoPaginaProps {
  titulo: string;
  subtitulo?: string;
  accion?: ReactNode;
}

/** Encabezado editorial compartido por todas las pantallas. */
export function EncabezadoPagina({ titulo, subtitulo, accion }: EncabezadoPaginaProps) {
  return (
    <header className="mb-7 flex justify-between items-end gap-4 flex-wrap">
      <div>
        <h1 className="titulo-pagina">{titulo}</h1>
        {subtitulo && <p className="subtitulo-pagina">{subtitulo}</p>}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </header>
  );
}
