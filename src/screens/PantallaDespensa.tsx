import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type {
  CategoriaIngrediente,
  Ingrediente,
  ItemDespensa,
  MovimientoStock,
  Unidad,
  UnidadBase,
} from '../domain/tipos';
import { formatearCantidad, pasoRapido } from '../domain/unidades';
import { estadoCaducidad, etiquetaCaducidad, normalizar, tiempoRelativo } from '../domain/utilidades';
import {
  reorganizarCategorias,
  type PropuestaCategoria,
} from '../services/categoriasProducto';
import { useTraduccion } from '../i18n/useTraduccion';
import {
  seleccionarAgotados,
  seleccionarCaducanPronto,
  seleccionarPocoStock,
  useAppStore,
} from '../store/useAppStore';
import { Chip } from '../components/Chip';
import { ControlCantidad } from '../components/ControlCantidad';
import { Icono } from '../components/Icono';
import { EncabezadoPagina } from '../components/EncabezadoPagina';

type FiltroDespensa = 'todos' | 'pocoStock' | 'agotados' | 'caducan' | 'nuevos';
type Vista = 'inventario' | 'historial';

/** Horas durante las que un producto cuenta como "recién añadido". */
const HORAS_NUEVO = 48;

function esRecienAnadido(item: ItemDespensa): boolean {
  if (!item.anadidoEn) return false;
  const ms = Date.now() - new Date(item.anadidoEn).getTime();
  return ms >= 0 && ms < HORAS_NUEVO * 3600_000;
}

const ICONO_CATEGORIA: Record<CategoriaIngrediente, string> = {
  verduras: 'eco',
  frutas: 'nutrition',
  lacteos: 'egg',
  proteinas: 'set_meal',
  granos: 'grain',
  condimentos: 'water_drop',
  otros: 'shopping_basket',
};

const ICONO_MOVIMIENTO: Record<MovimientoStock['tipo'], string> = {
  compra: 'add_shopping_cart',
  consumo: 'remove_circle',
  cocinado: 'skillet',
  ajuste: 'tune',
};

function BadgeCaducidad({ caducidad }: { caducidad?: string }) {
  const etiqueta = etiquetaCaducidad(caducidad);
  if (!etiqueta) return null;
  const estado = estadoCaducidad(caducidad);
  return (
    <span
      className={`inline-block mt-1 etiqueta ${
        estado === 'caducado' ? 'etiqueta-alerta' : 'etiqueta-terracota'
      }`}
    >
      {etiqueta}
    </span>
  );
}

function DetalleItem({
  item,
  ficha,
  onCaducidad,
  onStockMinimo,
  onGuardarFicha,
  onCantidad,
  onEliminar,
}: {
  item: ItemDespensa;
  ficha: Ingrediente;
  onCaducidad: (fecha: string | undefined) => void;
  onStockMinimo: (valor: number) => void;
  onGuardarFicha: (cambios: {
    nombre: string;
    marca: string;
    supermercado: string;
    unidadBase: UnidadBase;
  }) => void;
  onCantidad: (cantidad: number) => void;
  onEliminar: () => void;
}) {
  const unidadBase = ficha.unidadBase;
  const paso = pasoRapido(unidadBase);

  const [nombre, setNombre] = useState(ficha.nombre);
  const [marca, setMarca] = useState(ficha.marca ?? '');
  const [supermercado, setSupermercado] = useState(ficha.supermercado ?? '');
  const [unidad, setUnidad] = useState<UnidadBase>(unidadBase);
  const [cantidadTexto, setCantidadTexto] = useState(String(item.cantidad));
  const [guardado, setGuardado] = useState(false);

  const hayCambiosFicha =
    nombre.trim() !== ficha.nombre ||
    marca.trim() !== (ficha.marca ?? '') ||
    supermercado.trim() !== (ficha.supermercado ?? '') ||
    unidad !== unidadBase;

  const cantidadNum = Number(cantidadTexto.replace(',', '.'));
  const hayCambioCantidad =
    Number.isFinite(cantidadNum) && cantidadNum >= 0 && cantidadNum !== item.cantidad;

  const guardar = () => {
    if (hayCambiosFicha) {
      onGuardarFicha({
        nombre: nombre.trim() || ficha.nombre,
        marca: marca.trim(),
        supermercado: supermercado.trim(),
        unidadBase: unidad,
      });
    }
    if (hayCambioCantidad) onCantidad(cantidadNum);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1800);
  };

  return (
    <div className="mt-2 pt-2 border-t border-outline-variant/50 flex flex-col gap-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
        Editar producto
      </p>
      <label className="text-xs font-semibold text-on-surface-variant">
        Nombre
        <input
          className="campo text-sm mt-1 font-normal"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-on-surface-variant">
          Marca
          <input
            className="campo text-sm mt-1 font-normal"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="Hacendado…"
          />
        </label>
        <label className="text-xs font-semibold text-on-surface-variant">
          Supermercado
          <input
            className="campo text-sm mt-1 font-normal"
            value={supermercado}
            onChange={(e) => setSupermercado(e.target.value)}
            placeholder="Mercadona…"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-on-surface-variant">
          Unidad
          <select
            className="campo text-sm mt-1 font-normal"
            value={unidad}
            onChange={(e) => setUnidad(e.target.value as UnidadBase)}
          >
            <option value="ud">Unidades (ud)</option>
            <option value="g">Peso (gramos)</option>
            <option value="ml">Volumen (ml)</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-on-surface-variant">
          Cantidad exacta
          <input
            className="campo text-sm mt-1 font-normal"
            inputMode="decimal"
            value={cantidadTexto}
            onChange={(e) => setCantidadTexto(e.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={guardar}
        disabled={!hayCambiosFicha && !hayCambioCantidad}
        className="btn-primario py-2 text-sm justify-center disabled:opacity-40"
      >
        <Icono nombre={guardado ? 'check' : 'save'} className="text-base" />
        {guardado ? 'Guardado' : 'Guardar cambios'}
      </button>

      <label className="flex items-center justify-between gap-2 text-xs text-on-surface-variant mt-1">
        <span className="flex items-center gap-1 shrink-0">
          <Icono nombre="event" className="text-sm" /> Caducidad
        </span>
        <input
          type="date"
          value={item.caducidad ?? ''}
          onChange={(e) => onCaducidad(e.target.value || undefined)}
          className="campo text-xs py-1.5 px-2 w-auto max-w-[10.5rem]"
        />
      </label>
      {item.caducidad && (
        <button
          type="button"
          onClick={() => onCaducidad(undefined)}
          className="cursor-pointer self-end text-[11px] text-primary font-semibold hover:underline"
        >
          Quitar fecha
        </button>
      )}
      <div className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
        <span className="flex items-center gap-1">
          <Icono nombre="low_priority" className="text-sm" /> Avisar si queda menos de
        </span>
        <ControlCantidad
          valor={formatearCantidad(item.stockMinimo, unidadBase)}
          onRestar={() => onStockMinimo(Math.max(0, item.stockMinimo - paso))}
          onSumar={() => onStockMinimo(item.stockMinimo + paso)}
          ariaLabel="Stock mínimo"
        />
      </div>
      <button
        type="button"
        onClick={onEliminar}
        className="cursor-pointer mt-1 self-stretch px-3 py-2 rounded-xl border border-error/40 text-xs font-semibold text-error hover:bg-error-container/40 transition-colors flex items-center justify-center gap-1.5"
      >
        <Icono nombre="delete" className="text-base" /> Eliminar de la despensa
      </button>
    </div>
  );
}

export function PantallaDespensa() {
  const { t } = useTraduccion();
  const etiquetaCat = (c: CategoriaIngrediente) =>
    ({
      verduras: t('despensa.verduras'),
      frutas: t('despensa.frutas'),
      lacteos: t('despensa.lacteos'),
      proteinas: t('despensa.proteinas'),
      granos: t('despensa.granos'),
      condimentos: t('despensa.condimentos'),
      otros: t('despensa.otros'),
    })[c];
  const etiquetaMov = (tipo: MovimientoStock['tipo']) =>
    ({
      compra: t('despensa.movCompra'),
      consumo: t('despensa.movConsumo'),
      cocinado: t('despensa.movCocinado'),
      ajuste: t('despensa.movAjuste'),
    })[tipo];

  const despensa = useAppStore((s) => s.despensa);
  const catalogo = useAppStore((s) => s.ingredientes);
  const movimientos = useAppStore((s) => s.movimientos);
  const ajustarStock = useAppStore((s) => s.ajustarStock);
  const asegurarIngrediente = useAppStore((s) => s.asegurarIngrediente);
  const anadirItemManual = useAppStore((s) => s.anadirItemManual);
  const fijarCaducidad = useAppStore((s) => s.fijarCaducidad);
  const fijarStockMinimo = useAppStore((s) => s.fijarStockMinimo);
  const eliminarDeDespensa = useAppStore((s) => s.eliminarDeDespensa);
  const actualizarIngrediente = useAppStore((s) => s.actualizarIngrediente);
  const fijarCantidad = useAppStore((s) => s.fijarCantidad);
  const aplicarCategorias = useAppStore((s) => s.aplicarCategorias);

  const [vista, setVista] = useState<Vista>('inventario');
  const [filtro, setFiltro] = useState<FiltroDespensa>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [propuestas, setPropuestas] = useState<PropuestaCategoria[] | null>(null);
  const [avisoReorg, setAvisoReorg] = useState<string | null>(null);

  const fichas = useMemo(() => new Map(catalogo.map((i) => [i.id, i])), [catalogo]);
  const pocoStock = seleccionarPocoStock(despensa);
  const agotados = seleccionarAgotados(despensa);
  const caducan = seleccionarCaducanPronto(despensa);
  const nuevos = useMemo(() => despensa.filter(esRecienAnadido), [despensa]);

  const grupos = useMemo(() => {
    let filtrados =
      filtro === 'pocoStock'
        ? pocoStock
        : filtro === 'agotados'
          ? agotados
          : filtro === 'caducan'
            ? caducan
            : filtro === 'nuevos'
              ? nuevos
              : despensa;

    const q = normalizar(busqueda);
    if (q) {
      filtrados = filtrados.filter((item) => {
        const ficha = fichas.get(item.ingredienteId);
        if (!ficha) return false;
        return normalizar(
          `${ficha.nombre} ${ficha.marca ?? ''} ${ficha.supermercado ?? ''}`,
        ).includes(q);
      });
    }

    const porCategoria = new Map<CategoriaIngrediente, typeof filtrados>();
    for (const item of filtrados) {
      const categoria = fichas.get(item.ingredienteId)?.categoria ?? 'otros';
      porCategoria.set(categoria, [...(porCategoria.get(categoria) ?? []), item]);
    }
    return porCategoria;
  }, [despensa, filtro, busqueda, fichas, pocoStock, agotados, caducan, nuevos]);

  const abrirReorganizador = () => {
    const idsEnDespensa = new Set(despensa.map((i) => i.ingredienteId));
    const enDespensa = catalogo.filter((i) => idsEnDespensa.has(i.id));
    const props = reorganizarCategorias(enDespensa);
    setPropuestas(props);
    if (props.length === 0) {
      setAvisoReorg('Todo está ya en su categoría correcta.');
      setTimeout(() => setAvisoReorg(null), 2800);
      setPropuestas(null);
    }
  };

  const aceptarPropuestas = (lista: PropuestaCategoria[]) => {
    aplicarCategorias(
      lista.map((p) => ({ ingredienteId: p.ingredienteId, categoria: p.categoriaPropuesta })),
    );
    setPropuestas(null);
    setAvisoReorg(`${lista.length} producto${lista.length === 1 ? '' : 's'} recolocado${lista.length === 1 ? '' : 's'}`);
    setTimeout(() => setAvisoReorg(null), 2800);
  };

  const anadirNuevo = () => {
    if (!nuevoNombre.trim()) return;
    const id = asegurarIngrediente(nuevoNombre, 'otros', 'ud');
    ajustarStock(id, 1, 'compra', 'Alta manual');
    setNuevoNombre('');
  };

  return (
    <div>
      <EncabezadoPagina
        titulo={t('despensa.titulo')}
        subtitulo={t('despensa.subtitulo')}
      />

      <div className="flex gap-2 mb-4">
        <Chip activo={vista === 'inventario'} onClick={() => setVista('inventario')}>
          {t('despensa.inventario')}
        </Chip>
        <Chip activo={vista === 'historial'} onClick={() => setVista('historial')}>
          {t('despensa.historial')}
        </Chip>
      </div>

      {vista === 'inventario' ? (
        <>
          <label className="campo-busqueda mb-4 flex items-center gap-2">
            <Icono nombre="search" className="text-on-surface-variant shrink-0" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={t('despensa.buscar')}
              className="bg-transparent outline-none w-full text-on-surface placeholder:text-on-surface-variant/80"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                aria-label={t('comun.cerrar')}
                className="cursor-pointer text-on-surface-variant"
              >
                <Icono nombre="close" className="text-lg" />
              </button>
            )}
          </label>

          <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
            <Chip activo={filtro === 'todos'} onClick={() => setFiltro('todos')}>
              {t('despensa.todo')}
            </Chip>
            <Chip activo={filtro === 'nuevos'} onClick={() => setFiltro('nuevos')}>
              {t('despensa.recien')} ({nuevos.length})
            </Chip>
            <Chip activo={filtro === 'pocoStock'} onClick={() => setFiltro('pocoStock')}>
              {t('despensa.quedaPoco')} ({pocoStock.length})
            </Chip>
            <Chip activo={filtro === 'caducan'} onClick={() => setFiltro('caducan')}>
              {t('despensa.caducaPronto')} ({caducan.length})
            </Chip>
            <Chip activo={filtro === 'agotados'} onClick={() => setFiltro('agotados')}>
              {t('despensa.agotados')} ({agotados.length})
            </Chip>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && anadirNuevo()}
              placeholder="Añadir ingrediente a la despensa…"
              className="flex-1 campo text-sm"
            />
            <button
              type="button"
              onClick={anadirNuevo}
              aria-label="Añadir"
              className="cursor-pointer btn-primario w-11 h-11 p-0 rounded-xl shrink-0"
            >
              <Icono nombre="add" />
            </button>
          </div>

          <button
            type="button"
            onClick={abrirReorganizador}
            className="cursor-pointer mb-6 w-full tarjeta p-3 flex items-center gap-3 hover:border-primary-fixed-dim transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
              <Icono nombre="auto_fix_high" className="text-primary text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{t('despensa.reorganizar')}</h3>
              <p className="text-xs text-on-surface-variant">
                El asistente revisa la despensa y propone dónde va cada producto
              </p>
            </div>
            <Icono nombre="chevron_right" className="text-on-surface-variant" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {[...grupos.entries()].map(([categoria, items]) => (
              <section key={categoria}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-outline-variant/70">
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
                    <Icono nombre={ICONO_CATEGORIA[categoria]} className="text-primary text-lg" />
                  </div>
                  <h3 className="font-serif font-semibold text-lg">
                    {etiquetaCat(categoria)}
                  </h3>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((item) => {
                    const ficha = fichas.get(item.ingredienteId);
                    if (!ficha) return null;
                    const paso = pasoRapido(ficha.unidadBase);
                    const agotado = item.cantidad <= 0;
                    const bajo = !agotado && item.cantidad < item.stockMinimo;
                    const abierto = expandido === item.ingredienteId;
                    return (
                      <div key={item.ingredienteId} className="tarjeta p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center overflow-hidden shrink-0">
                              {ficha.imagen ? (
                                <img src={ficha.imagen} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Icono
                                  nombre={ICONO_CATEGORIA[ficha.categoria]}
                                  className="text-tertiary"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold truncate">{ficha.nombre}</h4>
                              {(ficha.marca || ficha.supermercado) && (
                                <p className="text-[11px] text-on-surface-variant truncate">
                                  {[ficha.marca, ficha.supermercado].filter(Boolean).join(' · ')}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {esRecienAnadido(item) && (
                                  <span className="etiqueta bg-primary-fixed text-on-primary-fixed-variant">
                                    {t('despensa.nuevo')}
                                  </span>
                                )}
                                {agotado && (
                                  <span className="etiqueta etiqueta-alerta">Agotado</span>
                                )}
                                {bajo && !agotado && (
                                  <span className="text-xs text-error flex items-center gap-1">
                                    <Icono nombre="warning" className="text-sm" /> Queda poco
                                  </span>
                                )}
                                <BadgeCaducidad caducidad={item.caducidad} />
                                {!agotado && !bajo && !etiquetaCaducidad(item.caducidad) && !esRecienAnadido(item) && (
                                  <p className="text-xs text-on-surface-variant">En stock</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <ControlCantidad
                              valor={formatearCantidad(item.cantidad, ficha.unidadBase)}
                              onRestar={() =>
                                ajustarStock(item.ingredienteId, -paso, 'consumo', 'Consumo rápido')
                              }
                              onSumar={() =>
                                ajustarStock(item.ingredienteId, paso, 'compra', 'Reposición rápida')
                              }
                              ariaLabel={`Stock de ${ficha.nombre}`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setExpandido(abierto ? null : item.ingredienteId)
                              }
                              className="cursor-pointer text-[11px] text-primary font-semibold hover:underline flex items-center gap-0.5"
                            >
                              <Icono nombre={abierto ? 'expand_less' : 'tune'} className="text-sm" />
                              {abierto ? 'Cerrar' : 'Ajustes'}
                            </button>
                          </div>
                        </div>

                        {(agotado || bajo) && (
                          <button
                            type="button"
                            onClick={() =>
                              anadirItemManual(
                                ficha.nombre,
                                Math.max(item.stockMinimo, paso),
                                ficha.unidadBase as Unidad,
                              )
                            }
                            className="cursor-pointer mt-2 text-[11px] text-primary font-semibold hover:underline"
                          >
                            Añadir a la compra
                          </button>
                        )}

                        {abierto && (
                          <DetalleItem
                            key={`${ficha.id}-${ficha.nombre}-${ficha.unidadBase}`}
                            item={item}
                            ficha={ficha}
                            onCaducidad={(fecha) => fijarCaducidad(item.ingredienteId, fecha)}
                            onStockMinimo={(valor) => fijarStockMinimo(item.ingredienteId, valor)}
                            onGuardarFicha={(cambios) =>
                              actualizarIngrediente(item.ingredienteId, cambios)
                            }
                            onCantidad={(cantidad) => fijarCantidad(item.ingredienteId, cantidad)}
                            onEliminar={() => {
                              if (
                                confirm(
                                  `¿Eliminar «${ficha.nombre}» de la despensa? Podrás volver a añadirlo después.`,
                                )
                              ) {
                                eliminarDeDespensa(item.ingredienteId);
                                setExpandido(null);
                              }
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {grupos.size === 0 && (
            <div className="text-center py-16 text-on-surface-variant">
              <Icono nombre="kitchen" className="text-5xl mb-3" />
              <p>Nada por aquí con este filtro.</p>
            </div>
          )}

          <Link
            to="/escanear"
            aria-label="Escanear producto"
            className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-secondary text-on-secondary rounded-2xl sombra-cocina flex items-center justify-center active:scale-95 transition-transform z-40"
          >
            <Icono nombre="barcode_scanner" className="text-2xl" />
          </Link>
        </>
      ) : (
        <div className="flex flex-col gap-2 max-w-2xl">
          {movimientos.length === 0 && (
            <p className="text-on-surface-variant text-center py-16">Aún no hay movimientos.</p>
          )}
          {movimientos.map((mov) => {
            const ficha = fichas.get(mov.ingredienteId);
            const entrada = mov.delta >= 0;
            return (
              <div key={mov.id} className="tarjeta p-3 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    entrada
                      ? 'bg-primary-fixed text-on-primary-fixed'
                      : 'bg-secondary-fixed text-on-secondary-fixed'
                  }`}
                >
                  <Icono nombre={ICONO_MOVIMIENTO[mov.tipo]} className="text-xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {ficha?.nombre ?? mov.ingredienteId}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {etiquetaMov(mov.tipo)}
                    {mov.nota ? ` · ${mov.nota}` : ''} · {tiempoRelativo(mov.fecha)}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${entrada ? 'text-primary' : 'text-secondary'}`}
                >
                  {entrada ? '+' : '−'}
                  {formatearCantidad(Math.abs(mov.delta), ficha?.unidadBase ?? 'ud')}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {propuestas && propuestas.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setPropuestas(null)}
        >
          <div
            className="bg-surface w-full sm:max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl sombra-cocina flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 pb-3 border-b border-outline-variant/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                <Icono nombre="auto_fix_high" className="text-primary text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">Propuestas del asistente</h3>
                <p className="text-xs text-on-surface-variant">
                  {propuestas.length} producto{propuestas.length === 1 ? '' : 's'} cambiarían de categoría
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPropuestas(null)}
                aria-label={t('comun.cerrar')}
                className="cursor-pointer btn-icono"
              >
                <Icono nombre="close" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {propuestas.map((p) => (
                <div key={p.ingredienteId} className="tarjeta p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.nombre}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1 flex-wrap">
                      {etiquetaCat(p.categoriaActual)}
                      <Icono nombre="arrow_forward" className="text-sm" />
                      <span className="font-semibold text-primary">
                        {etiquetaCat(p.categoriaPropuesta)}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPropuestas((prev) =>
                        prev ? prev.filter((x) => x.ingredienteId !== p.ingredienteId) : prev,
                      )
                    }
                    aria-label={`Descartar ${p.nombre}`}
                    className="cursor-pointer text-on-surface-variant hover:text-error"
                  >
                    <Icono nombre="close" className="text-lg" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 pt-3 border-t border-outline-variant/60 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => aceptarPropuestas(propuestas)}
                className="btn-primario justify-center"
              >
                <Icono nombre="done_all" /> Aplicar {propuestas.length} cambio{propuestas.length === 1 ? '' : 's'}
              </button>
              <button
                type="button"
                onClick={() => setPropuestas(null)}
                className="btn-secundario justify-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {avisoReorg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl text-sm z-50 sombra-cocina">
          {avisoReorg}
        </div>
      )}
    </div>
  );
}
