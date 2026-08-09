import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { CategoriaIngrediente, Unidad } from '../domain/tipos';
import { useAppStore } from '../store/useAppStore';
import type { SeleccionReceta } from '../services/compras';
import { Icono } from '../components/Icono';
import { EncabezadoPagina } from '../components/EncabezadoPagina';
import { ControlCantidad } from '../components/ControlCantidad';

const NOMBRE_CATEGORIA: Record<CategoriaIngrediente, string> = {
  verduras: 'Verduras',
  frutas: 'Frutas',
  lacteos: 'Lácteos',
  proteinas: 'Proteínas',
  granos: 'Granos y pasta',
  condimentos: 'Condimentos',
  otros: 'Otros',
};

/**
 * LISTA DE LA COMPRA DINÁMICA:
 *  - Se genera cruzando recetas seleccionadas × inventario (solo faltantes).
 *  - Checkbox interactivo: marcar "comprado" SUMA el ingrediente a la
 *    despensa automáticamente (y desmarcar lo revierte).
 *  - Admite apuntes manuales que no vienen de ninguna receta.
 */
export function PantallaListaCompra() {
  const listaCompra = useAppStore((s) => s.listaCompra);
  const recetas = useAppStore((s) => s.recetas);
  const catalogo = useAppStore((s) => s.ingredientes);
  const alternarComprado = useAppStore((s) => s.alternarComprado);
  const anadirItemManual = useAppStore((s) => s.anadirItemManual);
  const eliminarItemLista = useAppStore((s) => s.eliminarItemLista);
  const limpiarComprados = useAppStore((s) => s.limpiarComprados);
  const generarListaDesdeRecetas = useAppStore((s) => s.generarListaDesdeRecetas);

  /* --- Generador: selección de recetas con raciones --- */
  const [seleccion, setSeleccion] = useState<Map<string, number>>(new Map());
  const [aviso, setAviso] = useState<string | null>(null);

  /* --- Apunte manual --- */
  const [nombreManual, setNombreManual] = useState('');
  const [cantidadManual, setCantidadManual] = useState(1);
  const [unidadManual, setUnidadManual] = useState<Unidad>('ud');

  const fichas = useMemo(() => new Map(catalogo.map((i) => [i.id, i])), [catalogo]);
  const titulosReceta = useMemo(() => new Map(recetas.map((r) => [r.id, r.titulo])), [recetas]);

  const pendientes = listaCompra.filter((i) => !i.comprado).length;
  const recetasOrigen = new Set(listaCompra.flatMap((i) => i.recetaIds)).size;

  /* Agrupa la lista por categoría del ingrediente (como en el diseño). */
  const grupos = useMemo(() => {
    const porCategoria = new Map<CategoriaIngrediente, typeof listaCompra>();
    for (const item of listaCompra) {
      const categoria = item.ingredienteId
        ? (fichas.get(item.ingredienteId)?.categoria ?? 'otros')
        : 'otros';
      porCategoria.set(categoria, [...(porCategoria.get(categoria) ?? []), item]);
    }
    return porCategoria;
  }, [listaCompra, fichas]);

  /** Marca/desmarca una receta en el generador (raciones por defecto). */
  const alternarSeleccion = (recetaId: string, racionesBase: number) => {
    setSeleccion((previa) => {
      const siguiente = new Map(previa);
      if (siguiente.has(recetaId)) siguiente.delete(recetaId);
      else siguiente.set(recetaId, racionesBase);
      return siguiente;
    });
  };

  /** Cruza las recetas marcadas con la despensa y regenera la lista. */
  const generar = () => {
    const selecciones: SeleccionReceta[] = [...seleccion.entries()]
      .map(([id, raciones]) => {
        const receta = recetas.find((r) => r.id === id);
        return receta ? { receta, raciones } : null;
      })
      .filter((s): s is SeleccionReceta => s !== null);

    const cuantos = generarListaDesdeRecetas(selecciones);
    setAviso(cuantos > 0 ? `Lista generada: faltan ${cuantos} ingredientes` : '¡Tienes todo en casa!');
    setTimeout(() => setAviso(null), 2500);
  };

  const anadirManual = () => {
    if (!nombreManual.trim()) return;
    anadirItemManual(nombreManual, cantidadManual, unidadManual);
    setNombreManual('');
    setCantidadManual(1);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <EncabezadoPagina
        titulo="Lista de la compra"
        subtitulo={
          pendientes > 0
            ? `${pendientes} cosas por recoger${recetasOrigen > 0 ? ` · de ${recetasOrigen} receta${recetasOrigen > 1 ? 's' : ''}` : ''}`
            : 'Todo comprado, o la lista está vacía.'
        }
      />

      <Link
        to="/gastos/nuevo"
        className="tarjeta p-3 mb-4 flex items-center gap-3 hover:border-primary-fixed-dim transition-colors cursor-pointer"
      >
        <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0">
          <Icono nombre="receipt_long" className="text-secondary text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Guardar ticket de compra</h3>
          <p className="text-xs text-on-surface-variant">Escanea el ticket y asígnalo al hogar</p>
        </div>
        <Icono nombre="chevron_right" className="text-on-surface-variant" />
      </Link>

      {/* Generador desde recetas */}
      <details className="tarjeta p-4 mb-4">
        <summary className="cursor-pointer text-sm font-semibold flex items-center gap-2 list-none">
          <Icono nombre="auto_awesome" className="text-primary" />
          Generar desde recetas (cruza con tu despensa)
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          {recetas.map((receta) => {
            const marcada = seleccion.has(receta.id);
            return (
              <div key={receta.id} className="flex items-center gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={marcada}
                  onClick={() => alternarSeleccion(receta.id, receta.raciones)}
                  className={`cursor-pointer w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                    marcada ? 'bg-primary-container border-primary-container' : 'border-outline bg-surface'
                  }`}
                >
                  {marcada && <Icono nombre="check" className="text-sm text-on-primary-container" />}
                </button>
                <span className="text-sm flex-1 truncate">{receta.titulo}</span>
                {marcada && (
                  <ControlCantidad
                    valor={`${seleccion.get(receta.id)} rac.`}
                    onRestar={() =>
                      setSeleccion((p) => new Map(p).set(receta.id, Math.max(1, (p.get(receta.id) ?? 1) - 1)))
                    }
                    onSumar={() =>
                      setSeleccion((p) => new Map(p).set(receta.id, (p.get(receta.id) ?? 1) + 1))
                    }
                  />
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={generar}
            disabled={seleccion.size === 0}
            className="cursor-pointer mt-2 w-full btn-primario disabled:opacity-40"
          >
            Calcular ingredientes faltantes
          </button>
        </div>
      </details>

      {/* Apunte manual */}
      <div className="flex gap-2 mb-4">
        <input
          value={nombreManual}
          onChange={(e) => setNombreManual(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && anadirManual()}
          placeholder="Añadir artículo manual…"
          className="flex-1 min-w-0 campo text-sm"
        />
        <input
          type="number"
          min={1}
          value={cantidadManual}
          onChange={(e) => setCantidadManual(Math.max(1, Number(e.target.value)))}
          className="w-16 campo text-sm px-3"
          aria-label="Cantidad"
        />
        <select
          value={unidadManual}
          onChange={(e) => setUnidadManual(e.target.value as Unidad)}
          className="campo text-sm px-2 w-auto"
          aria-label="Unidad"
        >
          {(['ud', 'g', 'kg', 'ml', 'l'] as Unidad[]).map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={anadirManual}
          aria-label="Añadir a la lista"
          className="cursor-pointer btn-primario w-11 h-11 p-0 rounded-xl shrink-0"
        >
          <Icono nombre="add" />
        </button>
      </div>

      {/* Limpiar comprados */}
      {listaCompra.some((i) => i.comprado) && (
        <button
          type="button"
          onClick={limpiarComprados}
          className="cursor-pointer mb-4 btn-secundario py-2 px-4 text-sm"
        >
          <Icono nombre="delete_sweep" className="text-base" /> Vaciar comprados
        </button>
      )}

      {/* Lista agrupada por categoría */}
      {listaCompra.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <Icono nombre="shopping_cart" className="text-5xl mb-3" />
          <p>Tu lista está vacía. Genera una desde tus recetas o tu menú semanal.</p>
        </div>
      ) : (
        [...grupos.entries()].map(([categoria, items]) => (
          <section key={categoria} className="mb-5">
            <h3 className="text-sm font-bold text-on-surface mb-2 flex items-center gap-1.5">
              <Icono nombre="tag" className="text-primary text-base" /> {NOMBRE_CATEGORIA[categoria]}
            </h3>
            <div className="tarjeta divide-y divide-outline-variant/50 overflow-hidden p-0">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-4 transition-colors ${
                    item.comprado ? 'bg-surface-container' : ''
                  }`}
                >
                  {/* Checkbox: comprado → entra en despensa automáticamente */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.comprado}
                    aria-label={`Marcar ${item.nombre} como comprado`}
                    onClick={() => alternarComprado(item.id)}
                    className={`cursor-pointer w-6 h-6 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      item.comprado
                        ? 'bg-primary-container border-primary-container'
                        : 'border-outline bg-surface'
                    }`}
                  >
                    {item.comprado && (
                      <Icono nombre="check" className="text-base text-on-primary-container" />
                    )}
                  </button>

                  <div className={`flex-1 min-w-0 ${item.comprado ? 'checked-item' : ''}`}>
                    <p className="text-sm font-semibold truncate">{item.nombre}</p>
                    {item.recetaIds.length > 0 && (
                      <p className="text-xs text-on-surface-variant flex items-center gap-1 truncate">
                        <Icono nombre="restaurant" className="text-sm shrink-0" />
                        para{' '}
                        {item.recetaIds
                          .map((id) => titulosReceta.get(id) ?? 'receta')
                          .join(', ')}
                      </p>
                    )}
                    {item.manual && (
                      <p className="text-xs text-on-surface-variant">apunte manual</p>
                    )}
                  </div>

                  <span className={`text-sm text-on-surface-variant tabular-nums shrink-0 ${item.comprado ? 'checked-item' : ''}`}>
                    {new Intl.NumberFormat('es-ES').format(item.cantidad)} {item.unidad}
                  </span>

                  <button
                    type="button"
                    onClick={() => eliminarItemLista(item.id)}
                    aria-label={`Eliminar ${item.nombre}`}
                    className="cursor-pointer text-outline hover:text-error transition-colors p-1"
                  >
                    <Icono nombre="close" className="text-base" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {aviso && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl text-sm z-50 sombra-cocina">
          {aviso}
        </div>
      )}
    </div>
  );
}
