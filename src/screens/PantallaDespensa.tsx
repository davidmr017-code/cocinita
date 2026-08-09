import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type {
  CategoriaIngrediente,
  ItemDespensa,
  MovimientoStock,
  Unidad,
  UnidadBase,
} from '../domain/tipos';
import { formatearCantidad, pasoRapido } from '../domain/unidades';
import { estadoCaducidad, etiquetaCaducidad, tiempoRelativo } from '../domain/utilidades';
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

type FiltroDespensa = 'todos' | 'pocoStock' | 'agotados' | 'caducan';
type Vista = 'inventario' | 'historial';

const CATEGORIAS: Record<CategoriaIngrediente, { etiqueta: string; icono: string }> = {
  verduras: { etiqueta: 'Verduras', icono: 'eco' },
  frutas: { etiqueta: 'Frutas', icono: 'nutrition' },
  lacteos: { etiqueta: 'Lácteos y nevera', icono: 'egg' },
  proteinas: { etiqueta: 'Proteínas', icono: 'set_meal' },
  granos: { etiqueta: 'Granos y pasta', icono: 'grain' },
  condimentos: { etiqueta: 'Condimentos', icono: 'water_drop' },
  otros: { etiqueta: 'Otros', icono: 'shopping_basket' },
};

const MOVIMIENTOS_UI: Record<MovimientoStock['tipo'], { etiqueta: string; icono: string }> = {
  compra: { etiqueta: 'Compra', icono: 'add_shopping_cart' },
  consumo: { etiqueta: 'Consumo', icono: 'remove_circle' },
  cocinado: { etiqueta: 'Cocinado', icono: 'skillet' },
  ajuste: { etiqueta: 'Ajuste', icono: 'tune' },
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
  unidadBase,
  onCaducidad,
  onStockMinimo,
}: {
  item: ItemDespensa;
  unidadBase: UnidadBase;
  onCaducidad: (fecha: string | undefined) => void;
  onStockMinimo: (valor: number) => void;
}) {
  const paso = pasoRapido(unidadBase);
  return (
    <div className="mt-2 pt-2 border-t border-outline-variant/50 flex flex-col gap-2">
      <label className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
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
    </div>
  );
}

export function PantallaDespensa() {
  const despensa = useAppStore((s) => s.despensa);
  const catalogo = useAppStore((s) => s.ingredientes);
  const movimientos = useAppStore((s) => s.movimientos);
  const ajustarStock = useAppStore((s) => s.ajustarStock);
  const asegurarIngrediente = useAppStore((s) => s.asegurarIngrediente);
  const anadirItemManual = useAppStore((s) => s.anadirItemManual);
  const fijarCaducidad = useAppStore((s) => s.fijarCaducidad);
  const fijarStockMinimo = useAppStore((s) => s.fijarStockMinimo);

  const [vista, setVista] = useState<Vista>('inventario');
  const [filtro, setFiltro] = useState<FiltroDespensa>('todos');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  const fichas = useMemo(() => new Map(catalogo.map((i) => [i.id, i])), [catalogo]);
  const pocoStock = seleccionarPocoStock(despensa);
  const agotados = seleccionarAgotados(despensa);
  const caducan = seleccionarCaducanPronto(despensa);

  const grupos = useMemo(() => {
    const filtrados =
      filtro === 'pocoStock'
        ? pocoStock
        : filtro === 'agotados'
          ? agotados
          : filtro === 'caducan'
            ? caducan
            : despensa;

    const porCategoria = new Map<CategoriaIngrediente, typeof filtrados>();
    for (const item of filtrados) {
      const categoria = fichas.get(item.ingredienteId)?.categoria ?? 'otros';
      porCategoria.set(categoria, [...(porCategoria.get(categoria) ?? []), item]);
    }
    return porCategoria;
  }, [despensa, filtro, fichas, pocoStock, agotados, caducan]);

  const anadirNuevo = () => {
    if (!nuevoNombre.trim()) return;
    const id = asegurarIngrediente(nuevoNombre, 'otros', 'ud');
    ajustarStock(id, 1, 'compra', 'Alta manual');
    setNuevoNombre('');
  };

  return (
    <div>
      <EncabezadoPagina
        titulo="Mi despensa"
        subtitulo="Lo que hay en casa, lo que se acaba y lo que falta."
      />

      <div className="flex gap-2 mb-4">
        <Chip activo={vista === 'inventario'} onClick={() => setVista('inventario')}>
          Inventario
        </Chip>
        <Chip activo={vista === 'historial'} onClick={() => setVista('historial')}>
          Historial y compras
        </Chip>
      </div>

      {vista === 'inventario' ? (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
            <Chip activo={filtro === 'todos'} onClick={() => setFiltro('todos')}>
              Todo
            </Chip>
            <Chip activo={filtro === 'pocoStock'} onClick={() => setFiltro('pocoStock')}>
              Queda poco ({pocoStock.length})
            </Chip>
            <Chip activo={filtro === 'caducan'} onClick={() => setFiltro('caducan')}>
              Caduca pronto ({caducan.length})
            </Chip>
            <Chip activo={filtro === 'agotados'} onClick={() => setFiltro('agotados')}>
              Agotados ({agotados.length})
            </Chip>
          </div>

          <div className="flex gap-2 mb-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {[...grupos.entries()].map(([categoria, items]) => (
              <section key={categoria}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-outline-variant/70">
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
                    <Icono nombre={CATEGORIAS[categoria].icono} className="text-primary text-lg" />
                  </div>
                  <h3 className="font-serif font-semibold text-lg">
                    {CATEGORIAS[categoria].etiqueta}
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
                                  nombre={CATEGORIAS[ficha.categoria].icono}
                                  className="text-tertiary"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold truncate">{ficha.nombre}</h4>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {agotado && (
                                  <span className="etiqueta etiqueta-alerta">Agotado</span>
                                )}
                                {bajo && !agotado && (
                                  <span className="text-xs text-error flex items-center gap-1">
                                    <Icono nombre="warning" className="text-sm" /> Queda poco
                                  </span>
                                )}
                                <BadgeCaducidad caducidad={item.caducidad} />
                                {!agotado && !bajo && !etiquetaCaducidad(item.caducidad) && (
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
                            item={item}
                            unidadBase={ficha.unidadBase}
                            onCaducidad={(fecha) => fijarCaducidad(item.ingredienteId, fecha)}
                            onStockMinimo={(valor) => fijarStockMinimo(item.ingredienteId, valor)}
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
                  <Icono nombre={MOVIMIENTOS_UI[mov.tipo].icono} className="text-xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {ficha?.nombre ?? mov.ingredienteId}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {MOVIMIENTOS_UI[mov.tipo].etiqueta}
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
    </div>
  );
}
