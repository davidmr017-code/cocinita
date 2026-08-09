import { useRef, useState } from 'react';
import { Icono } from './Icono';

const ANCHO_MAX = 900;
const CALIDAD_JPEG = 0.75;

interface SelectorFotoProps {
  valor?: string;
  onChange: (dataUrl: string | undefined) => void;
}

/** Comprime y redimensiona una imagen a JPEG data URL para no saturar localStorage. */
async function comprimirImagen(archivo: File): Promise<string> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, ANCHO_MAX / bitmap.width);
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', CALIDAD_JPEG);
}

/**
 * Selector de foto desde cámara o galería.
 * En móvil, `capture="environment"` sugiere la cámara trasera.
 */
export function SelectorFoto({ valor, onChange }: SelectorFotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alElegir = async (archivo: File | undefined) => {
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      setError('Elige un archivo de imagen.');
      return;
    }
    setProcesando(true);
    setError(null);
    try {
      const dataUrl = await comprimirImagen(archivo);
      onChange(dataUrl);
    } catch {
      setError('No se pudo procesar la foto. Prueba con otra.');
    } finally {
      setProcesando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {valor ? (
        <div className="relative rounded-xl overflow-hidden border border-outline-variant">
          <img src={valor} alt="Foto de la receta" className="w-full h-44 object-cover" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label="Quitar foto"
            className="cursor-pointer absolute top-2 right-2 w-9 h-9 rounded-xl bg-surface/90 backdrop-blur-sm border border-outline-variant flex items-center justify-center"
          >
            <Icono nombre="close" className="text-lg" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={procesando}
          className="cursor-pointer tarjeta p-6 flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:border-primary-fixed-dim transition-colors disabled:opacity-50"
        >
          <Icono nombre={procesando ? 'hourglass_top' : 'add_a_photo'} className="text-3xl text-primary" />
          <span className="text-sm font-semibold text-on-surface">
            {procesando ? 'Procesando…' : 'Hacer foto o elegir de la galería'}
          </span>
          <span className="text-xs">Se comprimirá para caber en el móvil</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => alElegir(e.target.files?.[0])}
      />

      {valor && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={procesando}
          className="cursor-pointer btn-secundario py-2 text-sm self-start"
        >
          <Icono nombre="photo_camera" className="text-base" /> Cambiar foto
        </button>
      )}

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
