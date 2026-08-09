import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Icono } from './Icono';

interface EscannerCamaraProps {
  /** Se invoca una sola vez por lectura exitosa (EAN-13, UPC, etc.). */
  onCodigoLeido: (codigo: string) => void;
  /** Si true, pausa la cámara (p. ej. mientras se muestra el producto detectado). */
  pausado?: boolean;
}

type EstadoCamara = 'iniciando' | 'activo' | 'sin-permiso' | 'no-seguro' | 'no-soportado' | 'error';

/**
 * Visor de cámara con lectura de códigos de barras en tiempo real (ZXing).
 * En móvil exige contexto seguro (HTTPS); por eso el dev server usa SSL.
 */
export function EscannerCamara({ onCodigoLeido, pausado = false }: EscannerCamaraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lectorRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlesRef = useRef<{ stop: () => void } | null>(null);
  /** Evita disparar varias veces el mismo código seguidas. */
  const ultimoCodigoRef = useRef('');
  const ultimoTiempoRef = useRef(0);
  /** Callback estable: evita reiniciar la cámara en cada render del padre. */
  const onCodigoRef = useRef(onCodigoLeido);
  onCodigoRef.current = onCodigoLeido;

  const [estado, setEstado] = useState<EstadoCamara>('iniciando');
  const [mensajeError, setMensajeError] = useState('');
  const [linterna, setLinterna] = useState(false);

  const detenerCamara = useCallback(() => {
    controlesRef.current?.stop();
    controlesRef.current = null;
    lectorRef.current = null;
  }, []);

  const iniciarCamara = useCallback(async () => {
    if (pausado) return;

    // getUserMedia no funciona en http://192.168.x.x — solo en HTTPS o localhost.
    if (!window.isSecureContext) {
      setEstado('no-seguro');
      setMensajeError(
        'La cámara requiere HTTPS. Abre la app con https://… (no http://) o usa el campo manual abajo.',
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setEstado('no-soportado');
      setMensajeError('Tu navegador no permite acceder a la cámara.');
      return;
    }

    setEstado('iniciando');
    setMensajeError('');
    detenerCamara();

    const video = videoRef.current;
    if (!video) return;

    try {
      const lector = new BrowserMultiFormatReader();
      lectorRef.current = lector;

      // Cámara trasera en móvil (environment).
      const controles = await lector.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        video,
        (resultado, error) => {
          if (!resultado) {
            // NotFoundException es normal mientras busca — no mostrar error.
            if (error && error.name !== 'NotFoundException') {
              console.debug('[escáner]', error.message);
            }
            return;
          }

          const codigo = resultado.getText().trim();
          const ahora = Date.now();
          // Debounce: mismo código solo una vez cada 3 s (evita peticiones duplicadas).
          if (codigo === ultimoCodigoRef.current && ahora - ultimoTiempoRef.current < 3000) return;

          ultimoCodigoRef.current = codigo;
          ultimoTiempoRef.current = ahora;
          onCodigoRef.current(codigo);
        },
      );

      controlesRef.current = controles;
      setEstado('activo');
    } catch (err) {
      detenerCamara();
      const texto = err instanceof Error ? err.message : String(err);
      if (/permission|denied|notallowed/i.test(texto)) {
        setEstado('sin-permiso');
        setMensajeError('Permiso de cámara denegado. Actívalo en Ajustes del navegador.');
      } else {
        setEstado('error');
        setMensajeError(texto || 'No se pudo iniciar la cámara.');
      }
    }
  }, [detenerCamara, pausado]);

  useEffect(() => {
    if (pausado) {
      detenerCamara();
      return;
    }
    iniciarCamara();
    return detenerCamara;
  }, [pausado, iniciarCamara, detenerCamara]);

  /** Intenta activar/desactivar la linterna (solo algunos Android). */
  const alternarLinterna = async () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
        torch?: boolean;
      };
      if (!capabilities?.torch) return;

      const nuevo = !linterna;
      await track.applyConstraints({ advanced: [{ torch: nuevo } as MediaTrackConstraintSet] });
      setLinterna(nuevo);
    } catch {
      /* torch no soportado en este dispositivo */
    }
  };

  return (
    <div className="relative rounded-[var(--radius-card-lg)] overflow-hidden h-72 mb-4 bg-[#2c2926] tarjeta p-0 border-0">
      {/* Vídeo en vivo de la cámara */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${pausado || estado !== 'activo' ? 'opacity-0' : 'opacity-100'}`}
        muted
        playsInline
        autoPlay
        aria-label="Vista previa de la cámara para escanear"
      />

      {/* Estados sin cámara activa */}
      {(estado === 'iniciando' || pausado) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-high text-on-surface-variant gap-2">
          <Icono nombre="barcode_scanner" className="text-4xl animate-pulse" />
          <p className="text-sm">{pausado ? 'Escaneo en pausa' : 'Iniciando cámara…'}</p>
        </div>
      )}

      {(estado === 'sin-permiso' || estado === 'no-seguro' || estado === 'no-soportado' || estado === 'error') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-high p-4 text-center gap-3">
          <Icono nombre="videocam_off" className="text-4xl text-error" />
          <p className="text-sm text-on-surface-variant">{mensajeError}</p>
          {estado === 'sin-permiso' && (
            <button
              type="button"
              onClick={iniciarCamara}
              className="cursor-pointer btn-primario text-sm py-2 px-4"
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* Overlay del diseño Stitch: marco + instrucción */}
      {estado === 'activo' && !pausado && (
        <>
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-36 border-2 border-primary-fixed rounded-2xl shadow-[0_0_0_9999px_rgba(44,41,38,0.4)]" />
          </div>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/55 text-white text-xs px-4 py-2 rounded-xl whitespace-nowrap pointer-events-none font-medium">
            Encuadra el código de barras
          </p>
        </>
      )}

      {/* Linterna (Android) */}
      {estado === 'activo' && !pausado && (
        <button
          type="button"
          onClick={alternarLinterna}
          aria-label={linterna ? 'Apagar linterna' : 'Encender linterna'}
          className="cursor-pointer absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur"
        >
          <Icono nombre={linterna ? 'flashlight_on' : 'flashlight_off'} />
        </button>
      )}
    </div>
  );
}
