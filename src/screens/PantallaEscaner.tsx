import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ProductoEscaneado } from '../domain/tipos';
import { buscarProductoPorCodigo, ETIQUETA_CATEGORIA, mensajeErrorProducto, productoManual } from '../services/productos';
import { useAppStore } from '../store/useAppStore';
import { EscannerCamara } from '../components/EscannerCamara';
import { Icono } from '../components/Icono';
import { ControlCantidad } from '../components/ControlCantidad';
import { EncabezadoPagina } from '../components/EncabezadoPagina';

export function PantallaEscaner() {
  const navegar = useNavigate();
  const registrarProductoEscaneado = useAppStore((s) => s.registrarProductoEscaneado);

  const [codigo, setCodigo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [producto, setProducto] = useState<ProductoEscaneado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [caducidad, setCaducidad] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  const buscandoRef = useRef(false);
  const peticionIdRef = useRef(0);

  const buscarPorCodigo = useCallback(async (codigoBarras: string) => {
    const limpio = codigoBarras.trim();
    if (!limpio || buscandoRef.current) return;

    const peticionId = ++peticionIdRef.current;
    buscandoRef.current = true;
    setCodigo(limpio);
    setBuscando(true);
    setError(null);
    setProducto(null);
    setAviso('Código leído, buscando producto…');

    try {
      const resultado = await buscarProductoPorCodigo(limpio);
      if (peticionId !== peticionIdRef.current) return;

      if (resultado) {
        setProducto(resultado);
        setAviso(null);
      } else {
        setError(
          `No encontramos el producto (${limpio}). Puedes añadirlo a mano en la despensa.`,
        );
        setAviso(null);
      }
    } catch (err) {
      if (peticionId !== peticionIdRef.current) return;
      setError(mensajeErrorProducto(err));
      setAviso(null);
    } finally {
      if (peticionId === peticionIdRef.current) {
        buscandoRef.current = false;
        setBuscando(false);
      }
    }
  }, []);

  const anadirADespensa = () => {
    if (!producto) return;
    registrarProductoEscaneado(producto, cantidad, caducidad || undefined);
    navegar('/despensa');
  };

  const reiniciarEscaneo = () => {
    peticionIdRef.current++;
    buscandoRef.current = false;
    setBuscando(false);
    setProducto(null);
    setError(null);
    setCodigo('');
    setCantidad(1);
    setCaducidad('');
    setAviso(null);
  };

  const anadirManualmente = () => {
    if (!codigo.trim()) return;
    registrarProductoEscaneado(
      productoManual(codigo.trim(), `Producto ${codigo.trim()}`),
      cantidad,
      caducidad || undefined,
    );
    navegar('/despensa');
  };

  return (
    <div className="max-w-md mx-auto">
      <EncabezadoPagina
        titulo="Escanear producto"
        subtitulo="Apunta al código de barras y lo guardamos en tu despensa."
      />

      <EscannerCamara onCodigoLeido={buscarPorCodigo} pausado={producto !== null} />

      <details className="tarjeta p-4 mb-4">
        <summary className="cursor-pointer text-sm font-bold text-primary list-none flex items-center gap-2">
          <Icono nombre="keyboard" className="text-base" />
          Introducir código a mano
        </summary>
        <div className="flex gap-2 mt-3">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarPorCodigo(codigo)}
            inputMode="numeric"
            placeholder="737628064502"
            className="flex-1 campo text-sm"
            aria-label="Código de barras"
          />
          <button
            type="button"
            onClick={() => buscarPorCodigo(codigo)}
            disabled={buscando || !codigo.trim()}
            className="btn-primario disabled:opacity-50 shrink-0"
          >
            {buscando ? '…' : 'Buscar'}
          </button>
        </div>
        <p className="text-xs text-on-surface-variant mt-2">
          Prueba con{' '}
          <button
            type="button"
            className="cursor-pointer text-primary font-semibold underline"
            onClick={() => buscarPorCodigo('737628064502')}
          >
            737628064502
          </button>{' '}
          (fideos thai).
        </p>
      </details>

      {!window.isSecureContext && (
        <div className="tarjeta bg-secondary-fixed/60 border-secondary-fixed-dim p-3 text-xs mb-4 flex gap-2">
          <Icono nombre="lock" className="shrink-0 text-secondary" />
          <span>
            Para usar la cámara, abre la app con <strong>https://</strong>.
          </span>
        </div>
      )}

      {aviso && (
        <div className="tarjeta bg-primary-fixed/50 border-primary-fixed-dim p-3 text-sm mb-4 flex items-center gap-2">
          <Icono nombre="hourglass_top" className="animate-spin text-primary" /> {aviso}
        </div>
      )}

      {error && (
        <div className="tarjeta bg-error-container/80 border-error/20 p-4 text-sm mb-4 flex items-start gap-2">
          <Icono nombre="error" className="shrink-0 mt-0.5 text-error" />
          <div className="flex-1">
            <p>{error}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <button type="button" onClick={() => buscarPorCodigo(codigo)} className="cursor-pointer text-sm font-bold text-error underline">
                Reintentar
              </button>
              {codigo && (
                <button type="button" onClick={anadirManualmente} className="cursor-pointer text-sm font-bold text-error underline">
                  Añadir sin ficha
                </button>
              )}
              <button type="button" onClick={reiniciarEscaneo} className="cursor-pointer text-sm font-bold text-error underline">
                Escanear otro
              </button>
            </div>
          </div>
        </div>
      )}

      {producto && (
        <div className="tarjeta p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-serif font-semibold text-xl">Listo para guardar</h3>
            <button type="button" onClick={reiniciarEscaneo} aria-label="Escanear otro" className="btn-icono">
              <Icono nombre="close" />
            </button>
          </div>

          <div className="bg-surface-container-low rounded-xl p-3 flex items-center gap-3 mb-3 border border-outline-variant/50">
            <div className="w-14 h-14 bg-white rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-outline-variant/40">
              {producto.imagen ? (
                <img src={producto.imagen} alt="" className="w-full h-full object-contain" />
              ) : (
                <Icono nombre="grocery" className="text-tertiary" />
              )}
            </div>
            <div className="min-w-0">
              {producto.marca && (
                <p className="text-[11px] font-bold text-primary truncate">{producto.marca}</p>
              )}
              <p className="text-sm font-bold">{producto.nombre}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                <span className="etiqueta etiqueta-salvia py-0 px-1.5 text-[10px] mr-1">
                  {ETIQUETA_CATEGORIA[producto.categoria]}
                </span>
                {producto.cantidadEmpaque > 1 || producto.unidadBase !== 'ud'
                  ? `${producto.cantidadEmpaque}${producto.unidadBase} / envase`
                  : null}
              </p>
              <p className="text-xs text-on-surface-variant/80 mt-0.5">Código {producto.codigo}</p>
            </div>
          </div>

          {producto.ingredientesTexto && (
            <details className="mb-3">
              <summary className="cursor-pointer text-sm font-bold text-primary flex items-center gap-1 list-none">
                <Icono nombre="list_alt" className="text-base" /> Ingredientes del envase
              </summary>
              <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{producto.ingredientesTexto}</p>
            </details>
          )}

          <label className="flex items-center justify-between gap-3 mb-3 text-sm">
            <span className="text-on-surface-variant flex items-center gap-1 shrink-0">
              <Icono nombre="event" className="text-base" /> Caducidad (opcional)
            </span>
            <input
              type="date"
              value={caducidad}
              onChange={(e) => setCaducidad(e.target.value)}
              className="campo text-sm py-2 px-3 w-auto max-w-[11rem]"
            />
          </label>

          <div className="flex items-center gap-3">
            <ControlCantidad
              valor={cantidad}
              onRestar={() => setCantidad((c) => Math.max(1, c - 1))}
              onSumar={() => setCantidad((c) => c + 1)}
              ariaLabel="Envases a añadir"
            />
            <button type="button" onClick={anadirADespensa} className="cursor-pointer flex-1 btn-primario py-3">
              <Icono nombre="kitchen" /> A la despensa
            </button>
          </div>

          <button type="button" onClick={reiniciarEscaneo} className="cursor-pointer mt-3 w-full py-2 text-sm text-primary font-bold hover:underline">
            Escanear otro producto
          </button>
        </div>
      )}
    </div>
  );
}
