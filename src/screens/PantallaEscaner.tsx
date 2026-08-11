import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ProductoEscaneado, UnidadBase } from '../domain/tipos';
import {
  buscarProductoLocal,
  buscarProductoPorCodigo,
  ETIQUETA_CATEGORIA,
  mensajeErrorProducto,
  normalizarCodigoBarras,
  productoManual,
} from '../services/productos';
import { useAppStore } from '../store/useAppStore';
import { EscannerCamara } from '../components/EscannerCamara';
import { Icono } from '../components/Icono';
import { ControlCantidad } from '../components/ControlCantidad';
import { useTraduccion } from '../i18n/useTraduccion';
import { EncabezadoPagina } from '../components/EncabezadoPagina';

type FormRegistro = {
  nombre: string;
  supermercado: string;
  unidadBase: UnidadBase;
  cantidadEmpaque: string;
};

const FORM_VACIO: FormRegistro = {
  nombre: '',
  supermercado: '',
  unidadBase: 'ud',
  cantidadEmpaque: '1',
};

export function PantallaEscaner() {
  const { t } = useTraduccion();
  const navegar = useNavigate();
  const registrarProductoEscaneado = useAppStore((s) => s.registrarProductoEscaneado);
  const guardarFichaEscaneada = useAppStore((s) => s.guardarFichaEscaneada);
  const catalogo = useAppStore((s) => s.ingredientes);

  const [codigo, setCodigo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [producto, setProducto] = useState<ProductoEscaneado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [caducidad, setCaducidad] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [modalRegistro, setModalRegistro] = useState(false);
  const [form, setForm] = useState<FormRegistro>(FORM_VACIO);

  const buscandoRef = useRef(false);
  const peticionIdRef = useRef(0);
  const catalogoRef = useRef(catalogo);
  catalogoRef.current = catalogo;

  const abrirRegistro = useCallback((codigoBarras: string) => {
    setForm(FORM_VACIO);
    setCodigo(normalizarCodigoBarras(codigoBarras) || codigoBarras);
    setError(null);
    setAviso(null);
    setProducto(null);
    setModalRegistro(true);
  }, []);

  const buscarPorCodigo = useCallback(
    async (codigoBarras: string) => {
      const limpio = codigoBarras.trim();
      if (!limpio || buscandoRef.current) return;

      const peticionId = ++peticionIdRef.current;
      buscandoRef.current = true;
      setCodigo(limpio);
      setBuscando(true);
      setError(null);
      setProducto(null);
      setModalRegistro(false);
      setAviso(t('escaner.buscando'));

      try {
        const local = buscarProductoLocal(limpio, catalogoRef.current);
        if (local) {
          if (peticionId !== peticionIdRef.current) return;
          setProducto(local);
          setAviso(null);
          return;
        }

        const resultado = await buscarProductoPorCodigo(limpio);
        if (peticionId !== peticionIdRef.current) return;

        if (resultado) {
          setProducto(resultado);
          setAviso(null);
        } else {
          setAviso(null);
          abrirRegistro(limpio);
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
    },
    [abrirRegistro, t],
  );

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
    setModalRegistro(false);
    setForm(FORM_VACIO);
  };

  const confirmarRegistro = () => {
    const nombre = form.nombre.trim();
    if (!nombre || !codigo.trim()) return;

    const cantidadNum = Number(form.cantidadEmpaque.replace(',', '.'));
    const creado = productoManual(codigo.trim(), nombre, {
      supermercado: form.supermercado,
      unidadBase: form.unidadBase,
      cantidadEmpaque: Number.isFinite(cantidadNum) && cantidadNum > 0 ? cantidadNum : 1,
    });

    // Persiste el código de barras ya, aunque aún no se añada stock.
    guardarFichaEscaneada(creado);
    setProducto({ ...creado, origenLocal: true });
    setModalRegistro(false);
    setError(null);
    setCantidad(1);
  };

  useEffect(() => {
    if (!modalRegistro) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [modalRegistro]);

  const pausado = producto !== null || modalRegistro;

  return (
    <div className="max-w-md mx-auto">
      <EncabezadoPagina titulo={t('escaner.titulo')} subtitulo={t('escaner.subtitulo')} />

      <EscannerCamara onCodigoLeido={buscarPorCodigo} pausado={pausado} />

      <details className="tarjeta p-4 mb-4">
        <summary className="cursor-pointer text-sm font-bold text-primary list-none flex items-center gap-2">
          <Icono nombre="keyboard" className="text-base" />
          {t('escaner.codigoAMano')}
        </summary>
        <div className="flex gap-2 mt-3">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void buscarPorCodigo(codigo)}
            inputMode="numeric"
            placeholder={t('escaner.codigoPlaceholder')}
            className="flex-1 campo text-sm"
            aria-label={t('escaner.codigoBarras')}
          />
          <button
            type="button"
            onClick={() => void buscarPorCodigo(codigo)}
            disabled={buscando || !codigo.trim()}
            className="btn-primario disabled:opacity-50 shrink-0"
          >
            {buscando ? '…' : t('escaner.buscar')}
          </button>
        </div>
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
              <button
                type="button"
                onClick={() => void buscarPorCodigo(codigo)}
                className="cursor-pointer text-sm font-bold text-error underline"
              >
                {t('escaner.reintentar')}
              </button>
              {codigo && (
                <button
                  type="button"
                  onClick={() => abrirRegistro(codigo)}
                  className="cursor-pointer text-sm font-bold text-error underline"
                >
                  {t('escaner.registrar')}
                </button>
              )}
              <button
                type="button"
                onClick={reiniciarEscaneo}
                className="cursor-pointer text-sm font-bold text-error underline"
              >
                {t('escaner.escanearOtro')}
              </button>
            </div>
          </div>
        </div>
      )}

      {producto && (
        <div className="tarjeta p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-serif font-semibold text-xl">{t('escaner.listo')}</h3>
            <button
              type="button"
              onClick={reiniciarEscaneo}
              aria-label={t('escaner.otro')}
              className="btn-icono"
            >
              <Icono nombre="close" />
            </button>
          </div>

          <div className="bg-surface-container-low rounded-xl p-3 flex items-center gap-3 mb-3 border border-outline-variant/50">
            <div className="w-14 h-14 bg-white rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-outline-variant/40">
              {producto.imagen ? (
                <img src={producto.imagen} alt="" className="w-full h-full object-contain" />
              ) : (
                <Icono nombre="grocery" className="text-primary" />
              )}
            </div>
            <div className="min-w-0">
              {(producto.marca || producto.supermercado) && (
                <p className="text-[11px] font-bold text-primary truncate">
                  {[producto.marca, producto.supermercado].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="text-sm font-bold">{producto.nombre}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                <span className="etiqueta etiqueta-salvia py-0 px-1.5 text-[10px] mr-1">
                  {ETIQUETA_CATEGORIA[producto.categoria]}
                </span>
                {producto.origenLocal && (
                  <span className="etiqueta etiqueta-terracota py-0 px-1.5 text-[10px] mr-1">
                    {t('escaner.origenLocal')}
                  </span>
                )}
                {producto.cantidadEmpaque > 1 || producto.unidadBase !== 'ud'
                  ? t('escaner.envase', { n: producto.cantidadEmpaque, u: producto.unidadBase })
                  : null}
              </p>
              <p className="text-xs text-on-surface-variant/80 mt-0.5">
                {t('escaner.codigoBarras')} {producto.codigo}
              </p>
            </div>
          </div>

          {producto.ingredientesTexto && (
            <details className="mb-3">
              <summary className="cursor-pointer text-sm font-bold text-primary flex items-center gap-1 list-none">
                <Icono nombre="list_alt" className="text-base" /> {t('escaner.ingredientesEnvase')}
              </summary>
              <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                {producto.ingredientesTexto}
              </p>
            </details>
          )}

          <label className="flex items-center justify-between gap-3 mb-3 text-sm">
            <span className="text-on-surface-variant flex items-center gap-1 shrink-0">
              <Icono nombre="event" className="text-base" /> {t('escaner.caducidad')}
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
            <button
              type="button"
              onClick={anadirADespensa}
              className="cursor-pointer flex-1 btn-primario py-3"
            >
              <Icono nombre="kitchen" /> {t('escaner.aDespensa')}
            </button>
          </div>

          <button
            type="button"
            onClick={reiniciarEscaneo}
            className="cursor-pointer mt-3 w-full py-2 text-sm text-primary font-bold hover:underline"
          >
            {t('escaner.otro')}
          </button>
        </div>
      )}

      {modalRegistro && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setModalRegistro(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('escaner.modalTitulo')}
        >
          <div
            className="bg-surface w-full sm:max-w-md max-h-[90vh] rounded-t-3xl sm:rounded-3xl sombra-cocina flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 pb-3 border-b border-outline-variant/60 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                <Icono nombre="barcode_scanner" className="text-primary text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{t('escaner.modalTitulo')}</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">{t('escaner.modalSub')}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalRegistro(false)}
                aria-label={t('escaner.cancelar')}
                className="cursor-pointer btn-icono"
              >
                <Icono nombre="close" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              <label className="text-xs font-bold text-on-surface-variant">
                {t('escaner.codigoBarras')}
                <input
                  className="campo text-sm mt-1 font-normal tracking-wider"
                  value={codigo}
                  readOnly
                />
              </label>

              <label className="text-xs font-bold text-on-surface-variant">
                {t('escaner.nombre')}
                <input
                  className="campo text-sm mt-1 font-normal"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder={t('escaner.nombrePlaceholder')}
                  autoFocus
                />
              </label>

              <label className="text-xs font-bold text-on-surface-variant">
                {t('escaner.supermercado')}
                <input
                  className="campo text-sm mt-1 font-normal"
                  value={form.supermercado}
                  onChange={(e) => setForm((f) => ({ ...f, supermercado: e.target.value }))}
                  placeholder={t('escaner.supermercadoPlaceholder')}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold text-on-surface-variant">
                  {t('escaner.unidad')}
                  <select
                    className="campo text-sm mt-1 font-normal"
                    value={form.unidadBase}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, unidadBase: e.target.value as UnidadBase }))
                    }
                  >
                    <option value="ud">{t('escaner.unidadUd')}</option>
                    <option value="g">{t('escaner.unidadG')}</option>
                    <option value="ml">{t('escaner.unidadMl')}</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-on-surface-variant">
                  {t('escaner.cantidadEnvase')}
                  <input
                    className="campo text-sm mt-1 font-normal"
                    inputMode="decimal"
                    value={form.cantidadEmpaque}
                    onChange={(e) => setForm((f) => ({ ...f, cantidadEmpaque: e.target.value }))}
                  />
                </label>
              </div>
              <p className="text-[11px] text-on-surface-variant -mt-1">
                {t('escaner.cantidadEnvaseAyuda')}
              </p>
            </div>

            <div className="p-4 pt-3 border-t border-outline-variant/60 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmarRegistro}
                disabled={!form.nombre.trim()}
                className="btn-primario justify-center disabled:opacity-40"
              >
                <Icono nombre="save" /> {t('escaner.guardarFicha')}
              </button>
              <button
                type="button"
                onClick={() => setModalRegistro(false)}
                className="btn-secundario justify-center"
              >
                {t('escaner.cancelar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
