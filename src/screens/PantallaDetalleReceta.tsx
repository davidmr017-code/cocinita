import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAppStore } from '../store/useAppStore';
import { escalarIngredientes, indexarStock } from '../services/recetas';
import { calcularIngredientesFaltantes } from '../services/compras';
import { avisosParaReceta, ETIQUETA_ALERGENO } from '../services/perfil';
import { aUnidadBase, formatearCantidad } from '../domain/unidades';
import { diasDeLaSemana, aFechaISO } from '../domain/utilidades';
import { ControlCantidad } from '../components/ControlCantidad';
import { Icono } from '../components/Icono';
import { DIFICULTAD_LEGIBLE } from '../components/TarjetaReceta';

const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * DETALLE DE RECETA — réplica de la pantalla "detalle_de_receta" del diseño:
 *  - Escalado de raciones en vivo (2 → 4 personas multiplica cantidades).
 *  - Cada ingrediente se cruza con la despensa: "En despensa" / "Falta".
 *  - Los faltantes se envían a la lista de la compra con un toque.
 *  - Modo cocina con barra de progreso terracota; al terminar, descuenta
 *    los ingredientes del inventario automáticamente.
 *  - Vídeo de animación de la receta si está disponible.
 */
export function PantallaDetalleReceta() {
  const { id } = useParams();
  const navegar = useNavigate();

  const receta = useAppStore((s) => s.recetas.find((r) => r.id === id));
  const despensa = useAppStore((s) => s.despensa);
  const ingredientesCatalogo = useAppStore((s) => s.ingredientes);
  const miembros = useAppStore((s) => s.perfil.miembros);
  const alternarFavorita = useAppStore((s) => s.alternarFavorita);
  const eliminarReceta = useAppStore((s) => s.eliminarReceta);
  const generarListaDesdeRecetas = useAppStore((s) => s.generarListaDesdeRecetas);
  const cocinarReceta = useAppStore((s) => s.cocinarReceta);
  const anadirAlMenu = useAppStore((s) => s.anadirAlMenu);

  const [raciones, setRaciones] = useState(receta?.raciones ?? 2);
  const [modoCocina, setModoCocina] = useState(false);
  const [pasosHechos, setPasosHechos] = useState<Set<number>>(new Set());
  const [aviso, setAviso] = useState<string | null>(null);

  const avisosPerfil = useMemo(() => {
    if (!receta) return { alergenos: [], evitados: [] };
    return avisosParaReceta(receta, ingredientesCatalogo, miembros);
  }, [receta, ingredientesCatalogo, miembros]);

  /* Ingredientes escalados a las raciones elegidas + estado vs despensa. */
  const lineas = useMemo(() => {
    if (!receta) return [];
    const stock = indexarStock(despensa);
    const fichas = new Map(ingredientesCatalogo.map((i) => [i.id, i]));
    return escalarIngredientes(receta, raciones).map((ing) => {
      const { cantidad: necesaria, base } = aUnidadBase(ing.cantidad, ing.unidad);
      const disponible = stock.get(ing.ingredienteId) ?? 0;
      return {
        ...ing,
        nombre: fichas.get(ing.ingredienteId)?.nombre ?? ing.ingredienteId,
        textoCantidad: formatearCantidad(necesaria, base),
        enDespensa: disponible >= necesaria,
      };
    });
  }, [receta, raciones, despensa, ingredientesCatalogo]);

  if (!receta) {
    return <p className="text-on-surface-variant py-16 text-center">Receta no encontrada.</p>;
  }

  const faltan = lineas.filter((l) => !l.enDespensa).length;

  /** Envía SOLO los faltantes de esta receta (escalada) a la lista. */
  const anadirFaltantes = () => {
    const cuantos = calcularIngredientesFaltantes(
      [{ receta, raciones }],
      despensa,
      ingredientesCatalogo,
    ).length;
    generarListaDesdeRecetas([{ receta, raciones }]);
    setAviso(cuantos > 0 ? `${cuantos} ingredientes añadidos a la lista` : '¡Lo tienes todo en casa!');
    setTimeout(() => setAviso(null), 2500);
  };

  /** Marca/desmarca un paso en modo cocina. */
  const alternarPaso = (indice: number) => {
    if (!modoCocina) return;
    setPasosHechos((previos) => {
      const siguientes = new Set(previos);
      if (siguientes.has(indice)) siguientes.delete(indice);
      else siguientes.add(indice);
      return siguientes;
    });
  };

  /** Fin de la cocción: descuenta stock y sale del modo cocina. */
  const terminarDeCocinar = () => {
    cocinarReceta(receta.id, raciones);
    setModoCocina(false);
    setPasosHechos(new Set());
    setAviso('Ingredientes descontados de tu despensa. ¡Buen provecho!');
    setTimeout(() => setAviso(null), 2500);
  };

  const progreso = receta.pasos.length > 0 ? (pasosHechos.size / receta.pasos.length) * 100 : 0;

  return (
    <div>
      {/* Imagen protagonista con barra de progreso en modo cocina */}
      <div className="relative w-full h-64 md:h-96 rounded-[var(--radius-card-lg)] overflow-hidden mb-6 tarjeta p-0">
        {modoCocina && (
          <div
            className="absolute top-0 left-0 h-1.5 bg-secondary transition-all duration-300 z-10"
            style={{ width: `${progreso}%` }}
          />
        )}
        <div
          className="w-full h-full bg-surface-container bg-cover bg-center"
          style={receta.imagen ? { backgroundImage: `url('${receta.imagen}')` } : undefined}
        />
        <button
          type="button"
          onClick={() => alternarFavorita(receta.id)}
          aria-label="Favorita"
          className="cursor-pointer absolute top-4 right-4 w-10 h-10 rounded-xl bg-surface/90 backdrop-blur-sm border border-outline-variant/50 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Icono
            nombre="favorite"
            relleno={receta.favorita}
            className={`text-xl ${receta.favorita ? 'text-secondary' : 'text-on-surface-variant'}`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Columna izquierda: título, raciones e ingredientes */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div>
            <h2 className="font-serif font-semibold text-3xl md:text-4xl leading-tight mb-2 tracking-tight">
              {receta.titulo}
            </h2>
            <p className="text-on-surface-variant text-lg mb-4">{receta.descripcion}</p>
            <div className="flex flex-wrap gap-2">
              <span className="etiqueta etiqueta-salvia inline-flex items-center gap-1">
                <Icono nombre="schedule" className="text-base" /> {receta.tiempoMin} min
              </span>
              <span className="etiqueta etiqueta-terracota inline-flex items-center gap-1">
                <Icono nombre="restaurant" className="text-base" /> {DIFICULTAD_LEGIBLE[receta.dificultad]}
              </span>
              {receta.etiquetas.map((e) => (
                <span key={e} className="etiqueta bg-surface-container text-on-surface">
                  {e}
                </span>
              ))}
            </div>
          </div>

          {(avisosPerfil.alergenos.length > 0 || avisosPerfil.evitados.length > 0) && (
            <div className="tarjeta p-4 border-error/25 bg-error-container/40">
              <p className="text-sm font-bold text-on-error-container flex items-center gap-1.5 mb-2">
                <Icono nombre="warning" /> Atención para tu hogar
              </p>
              <ul className="flex flex-col gap-1.5 text-xs text-on-error-container">
                {avisosPerfil.alergenos.map((c, i) => (
                  <li key={`a-${i}`}>
                    <strong>{c.miembroNombre}</strong>: posible{' '}
                    {ETIQUETA_ALERGENO[c.alergeno].toLowerCase()} (contiene {c.motivo})
                  </li>
                ))}
                {avisosPerfil.evitados.map((c, i) => (
                  <li key={`e-${i}`}>
                    <strong>{c.miembroNombre}</strong> evita «{c.evitado}» (hay {c.ingrediente})
                  </li>
                ))}
              </ul>
              <Link
                to="/perfil"
                className="cursor-pointer inline-block mt-2 text-xs font-bold text-error underline"
              >
                Editar perfil del hogar
              </Link>
            </div>
          )}

          {/* Escalador de raciones */}
          <div className="tarjeta p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icono nombre="group" className="text-primary" />
              <span className="text-sm font-semibold">Raciones</span>
            </div>
            <ControlCantidad
              valor={raciones}
              onRestar={() => setRaciones((r) => Math.max(1, r - 1))}
              onSumar={() => setRaciones((r) => r + 1)}
              ariaLabel="Ajustar raciones"
            />
          </div>

          {/* Ingredientes cruzados con la despensa */}
          <div className="tarjeta p-4 border border-outline-variant/60">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif font-semibold text-2xl">Ingredientes</h3>
              <span className="text-xs text-on-surface-variant">
                {faltan > 0 ? `Faltan ${faltan}` : 'Todo en casa'}
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {lineas.map((linea) => (
                <li key={linea.ingredienteId} className="flex items-center gap-3">
                  <span className="text-sm">
                    <strong className="font-semibold">{linea.textoCantidad}</strong> {linea.nombre}
                    {linea.indispensable && (
                      <span className="text-secondary" title="Indispensable"> *</span>
                    )}
                  </span>
                  {linea.enDespensa ? (
                    <span className="ml-auto text-xs text-primary flex items-center gap-1 shrink-0">
                      <Icono nombre="check_circle" className="text-base" /> En despensa
                    </span>
                  ) : (
                    <span className="ml-auto text-xs text-error flex items-center gap-1 shrink-0">
                      <Icono nombre="error" className="text-base" /> Falta
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-on-surface-variant mt-3">* indispensable para la receta</p>
            <button
              type="button"
              onClick={anadirFaltantes}
              className="cursor-pointer mt-4 w-full btn-secundario text-secondary border-secondary/40 hover:bg-secondary-fixed/50"
            >
              <Icono nombre="add_shopping_cart" /> Añadir faltantes a la compra
            </button>
          </div>

          {/* Añadir al menú semanal (día + comida/cena) */}
          <details className="tarjeta p-4">
            <summary className="cursor-pointer text-sm font-semibold flex items-center gap-2 list-none">
              <Icono nombre="calendar_add_on" className="text-primary" /> Añadir al menú semanal
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {(['comida', 'cena'] as const).map((comida) => (
                <div key={comida} className="flex items-center gap-2">
                  <span className="text-xs w-14 capitalize text-on-surface-variant">{comida}</span>
                  <div className="flex gap-1">
                    {diasDeLaSemana().map((dia, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          anadirAlMenu(aFechaISO(dia), comida, receta.id, raciones);
                          setAviso(`Añadida al menú (${comida})`);
                          setTimeout(() => setAviso(null), 2000);
                        }}
                        className="cursor-pointer w-8 h-8 rounded-lg bg-surface-container text-xs font-bold hover:bg-primary-fixed hover:text-on-primary-fixed-variant transition-colors"
                        aria-label={`Añadir el ${aFechaISO(dia)} (${comida})`}
                      >
                        {DIAS_CORTOS[i]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* Vídeo / publicación original */}
          {(receta.videoUrl || receta.origenUrl) && (
            <div className="tarjeta p-4">
              <h3 className="font-serif font-semibold text-2xl mb-3">Vídeo y origen</h3>
              {receta.videoUrl &&
              /\.(mp4|webm|ogg)(\?|$)/i.test(receta.videoUrl) ? (
                <video
                  src={receta.videoUrl}
                  controls
                  preload="metadata"
                  className="w-full rounded-lg bg-surface-container mb-3"
                />
              ) : receta.videoUrl ? (
                <a
                  href={receta.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secundario mb-3 w-full"
                >
                  <Icono nombre="play_circle" /> Abrir vídeo enlazado
                </a>
              ) : null}
              {receta.origenUrl && (
                <a
                  href={receta.origenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primario w-full"
                >
                  <Icono nombre="open_in_new" /> Ver publicación original
                </a>
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: pasos + modo cocina */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-serif font-semibold text-2xl">Elaboración</h3>
            <div className="flex gap-2">
              {modoCocina ? (
                <>
                  <button
                    type="button"
                    onClick={terminarDeCocinar}
                    className="cursor-pointer btn-primario"
                  >
                    <Icono nombre="done_all" /> He terminado
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoCocina(false)}
                    className="cursor-pointer px-5 py-2 bg-error text-on-error rounded-xl text-sm font-semibold active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Icono nombre="stop" /> Salir
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setModoCocina(true)}
                  className="cursor-pointer btn-primario"
                >
                  <Icono nombre="play_arrow" /> Empezar a cocinar
                </button>
              )}
            </div>
          </div>

          {/* Línea temporal de pasos, como en el diseño */}
          <div className="flex flex-col gap-4 relative pl-8 border-l-2 border-surface-variant ml-4">
            {receta.pasos.map((paso, i) => {
              const hecho = pasosHechos.has(i);
              return (
                <div key={i} className="relative group">
                  <div
                    className={`absolute -left-[41px] top-0 w-8 h-8 rounded-full border-2 border-surface flex items-center justify-center text-sm font-semibold transition-colors ${
                      hecho
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => alternarPaso(i)}
                    className={`w-full text-left tarjeta p-4 border transition-all ${
                      modoCocina ? 'cursor-pointer hover:border-primary-fixed-dim' : 'cursor-default'
                    } ${hecho ? 'opacity-55' : ''}`}
                  >
                    <h4 className="text-sm font-semibold mb-1">{paso.titulo}</h4>
                    <p className="text-on-surface-variant">{paso.descripcion}</p>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Acciones secundarias */}
          <div className="flex gap-3 mt-2">
            <Link
              to={`/receta/${receta.id}/editar`}
              className="cursor-pointer btn-secundario py-2 px-4 text-sm"
            >
              <Icono nombre="edit" className="text-base" /> Editar
            </Link>
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Eliminar esta receta?')) {
                  eliminarReceta(receta.id);
                  navegar('/recetas');
                }
              }}
              className="cursor-pointer px-4 py-2 rounded-xl border border-error/40 text-sm text-error hover:bg-error-container/40 transition-colors flex items-center gap-1"
            >
              <Icono nombre="delete" className="text-base" /> Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Aviso flotante (snackbar) */}
      {aviso && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl text-sm z-50 sombra-cocina">
          {aviso}
        </div>
      )}
    </div>
  );
}
