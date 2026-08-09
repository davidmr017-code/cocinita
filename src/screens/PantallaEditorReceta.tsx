import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { Dificultad, PasoReceta, Receta, Unidad } from '../domain/tipos';
import { baseDe } from '../domain/unidades';
import { nuevoId } from '../domain/utilidades';
import { useAppStore } from '../store/useAppStore';
import { parsearTextoIngredientes } from '../services/parsearIngredientes';
import { Icono } from '../components/Icono';
import { SelectorFoto } from '../components/SelectorFoto';

/** Fila editable de ingrediente (por nombre, se resuelve a id al guardar). */
interface FilaIngrediente {
  nombre: string;
  cantidad: number;
  unidad: Unidad;
  indispensable: boolean;
}

const UNIDADES: Unidad[] = ['g', 'kg', 'ml', 'l', 'ud', 'cda', 'cdta'];

const CAMPO = 'campo text-sm';

function filasATexto(filas: FilaIngrediente[]): string {
  return filas
    .filter((f) => f.nombre.trim())
    .map((f) => `${f.cantidad} ${f.unidad} ${f.nombre}`.replace(/^1 ud /i, ''))
    .join('\n');
}

/**
 * EDITOR DE RECETA — creación manual y edición.
 * Incluye escritura libre de ingredientes (detecta cantidad, unidad y nombre).
 */
export function PantallaEditorReceta() {
  const { id } = useParams();
  const navegar = useNavigate();

  const recetas = useAppStore((s) => s.recetas);
  const catalogo = useAppStore((s) => s.ingredientes);
  const guardarReceta = useAppStore((s) => s.guardarReceta);
  const asegurarIngrediente = useAppStore((s) => s.asegurarIngrediente);

  const existente = recetas.find((r) => r.id === id);
  const nombresCatalogo = new Map(catalogo.map((i) => [i.id, i.nombre]));

  const filasIniciales: FilaIngrediente[] =
    existente?.ingredientes.map((ing) => ({
      nombre: nombresCatalogo.get(ing.ingredienteId) ?? ing.ingredienteId,
      cantidad: ing.cantidad,
      unidad: ing.unidad,
      indispensable: ing.indispensable,
    })) ?? [];

  const [titulo, setTitulo] = useState(existente?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '');
  const [imagen, setImagen] = useState(existente?.imagen ?? '');
  const [videoUrl, setVideoUrl] = useState(existente?.videoUrl ?? '');
  const [origenUrl, setOrigenUrl] = useState(existente?.origenUrl ?? '');
  const [raciones, setRaciones] = useState(existente?.raciones ?? 2);
  const [tiempoMin, setTiempoMin] = useState(existente?.tiempoMin ?? 30);
  const [dificultad, setDificultad] = useState<Dificultad>(existente?.dificultad ?? 'facil');
  const [etiquetas, setEtiquetas] = useState(existente?.etiquetas.join(', ') ?? '');
  const [ingredientes, setIngredientes] = useState<FilaIngrediente[]>(
    filasIniciales.length > 0
      ? filasIniciales
      : [{ nombre: '', cantidad: 1, unidad: 'ud', indispensable: false }],
  );
  const [textoIngredientes, setTextoIngredientes] = useState(() =>
    filasATexto(filasIniciales),
  );
  const [modoTexto, setModoTexto] = useState(!existente);
  const [pasos, setPasos] = useState<PasoReceta[]>(
    existente?.pasos ?? [{ titulo: '', descripcion: '' }],
  );

  const cambiarIngrediente = (i: number, cambios: Partial<FilaIngrediente>) =>
    setIngredientes((filas) => filas.map((f, j) => (j === i ? { ...f, ...cambios } : f)));

  const cambiarPaso = (i: number, cambios: Partial<PasoReceta>) =>
    setPasos((filas) => filas.map((f, j) => (j === i ? { ...f, ...cambios } : f)));

  const organizarDesdeTexto = () => {
    const parseados = parsearTextoIngredientes(textoIngredientes);
    if (parseados.length === 0) {
      alert('No se detectó ningún ingrediente. Escribe uno por línea, p. ej. «200 g de tomate».');
      return;
    }
    const filas: FilaIngrediente[] = parseados.map((p) => ({
      nombre: p.nombre,
      cantidad: Math.round(p.cantidad * 100) / 100,
      unidad: p.unidad,
      indispensable: true,
    }));
    setIngredientes(filas);
    setTextoIngredientes(filasATexto(filas));
    setModoTexto(false);
  };

  const guardar = () => {
    if (!titulo.trim()) return alert('La receta necesita un título.');

    let filas = ingredientes.filter((f) => f.nombre.trim() && f.cantidad > 0);
    if (modoTexto && textoIngredientes.trim()) {
      filas = parsearTextoIngredientes(textoIngredientes).map((p) => ({
        nombre: p.nombre,
        cantidad: p.cantidad,
        unidad: p.unidad,
        indispensable: true,
      }));
    }
    if (filas.length === 0) return alert('Añade al menos un ingrediente.');

    const receta: Receta = {
      id: existente?.id ?? nuevoId(),
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      imagen: imagen.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      origenUrl: origenUrl.trim() || undefined,
      raciones,
      tiempoMin,
      dificultad,
      etiquetas: etiquetas
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
      ingredientes: filas.map((f) => ({
        ingredienteId: asegurarIngrediente(f.nombre, 'otros', baseDe(f.unidad)),
        cantidad: f.cantidad,
        unidad: f.unidad,
        indispensable: f.indispensable,
      })),
      pasos: pasos.filter((p) => p.descripcion.trim()),
      favorita: existente?.favorita ?? false,
      origen: existente?.origen ?? 'propia',
      autor: existente?.autor,
      aprendida: existente?.aprendida ?? false,
      creadaEn: existente?.creadaEn ?? new Date().toISOString(),
    };
    guardarReceta(receta);
    navegar(`/receta/${receta.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <h2 className="titulo-pagina">{existente ? 'Editar receta' : 'Nueva receta'}</h2>
        {!existente && (
          <Link to="/receta/importar" className="btn-secundario text-sm py-2">
            <Icono nombre="movie" className="text-base" /> Importar de redes
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <input
          className={CAMPO}
          placeholder="Título de la receta"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <textarea
          className={CAMPO}
          rows={2}
          placeholder="Descripción breve"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        <div>
          <p className="text-xs text-on-surface-variant mb-2">Foto de la receta</p>
          <SelectorFoto
            valor={imagen || undefined}
            onChange={(dataUrl) => setImagen(dataUrl ?? '')}
          />
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-primary list-none">
              Usar URL en su lugar
            </summary>
            <input
              className={`${CAMPO} mt-2`}
              placeholder="https://… (foto online)"
              value={imagen.startsWith('data:') ? '' : imagen}
              onChange={(e) => setImagen(e.target.value)}
            />
          </details>
        </div>

        <input
          className={CAMPO}
          placeholder="URL del vídeo (opcional)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        <input
          className={CAMPO}
          placeholder="Enlace a la publicación original (IG / TikTok / FB)"
          value={origenUrl}
          onChange={(e) => setOrigenUrl(e.target.value)}
        />

        <div className="grid grid-cols-3 gap-3">
          <label className="text-xs text-on-surface-variant">
            Raciones
            <input
              type="number"
              min={1}
              className={CAMPO}
              value={raciones}
              onChange={(e) => setRaciones(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <label className="text-xs text-on-surface-variant">
            Tiempo (min)
            <input
              type="number"
              min={1}
              className={CAMPO}
              value={tiempoMin}
              onChange={(e) => setTiempoMin(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <label className="text-xs text-on-surface-variant">
            Dificultad
            <select
              className={CAMPO}
              value={dificultad}
              onChange={(e) => setDificultad(e.target.value as Dificultad)}
            >
              <option value="facil">Fácil</option>
              <option value="media">Media</option>
              <option value="dificil">Difícil</option>
            </select>
          </label>
        </div>
        <input
          className={CAMPO}
          placeholder="Etiquetas separadas por comas (vegano, rápido...)"
          value={etiquetas}
          onChange={(e) => setEtiquetas(e.target.value)}
        />

        {/* -------- Ingredientes -------- */}
        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
          <h3 className="font-serif font-semibold text-xl">Ingredientes</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!modoTexto) setTextoIngredientes(filasATexto(ingredientes));
                setModoTexto(true);
              }}
              className={`cursor-pointer text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                modoTexto
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              Escribir lista
            </button>
            <button
              type="button"
              onClick={() => {
                if (modoTexto && textoIngredientes.trim()) organizarDesdeTexto();
                else setModoTexto(false);
              }}
              className={`cursor-pointer text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                !modoTexto
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              Lista organizada
            </button>
          </div>
        </div>

        {modoTexto ? (
          <div className="tarjeta p-4 flex flex-col gap-3">
            <p className="text-xs text-on-surface-variant">
              Escribe un ingrediente por línea. Detectamos cantidad, unidad y nombre
              automáticamente.
            </p>
            <textarea
              className={`${CAMPO} min-h-[180px] font-normal`}
              value={textoIngredientes}
              onChange={(e) => setTextoIngredientes(e.target.value)}
              placeholder={`200 g de tomate\n2 huevos\n1 cda de aceite de oliva\nsal al gusto`}
            />
            <button type="button" onClick={organizarDesdeTexto} className="btn-primario self-start">
              <Icono nombre="auto_fix" /> Organizar ingredientes
            </button>
          </div>
        ) : (
          <>
            <datalist id="catalogo-ingredientes">
              {catalogo.map((i) => (
                <option key={i.id} value={i.nombre} />
              ))}
            </datalist>
            {ingredientes.map((fila, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className={`${CAMPO} flex-1`}
                  placeholder="Ingrediente"
                  list="catalogo-ingredientes"
                  value={fila.nombre}
                  onChange={(e) => cambiarIngrediente(i, { nombre: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  className={`${CAMPO} w-20`}
                  value={fila.cantidad}
                  onChange={(e) => cambiarIngrediente(i, { cantidad: Number(e.target.value) })}
                  aria-label="Cantidad"
                />
                <select
                  className={`${CAMPO} w-20`}
                  value={fila.unidad}
                  onChange={(e) => cambiarIngrediente(i, { unidad: e.target.value as Unidad })}
                  aria-label="Unidad"
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  title="Indispensable"
                  aria-label="Marcar como indispensable"
                  onClick={() => cambiarIngrediente(i, { indispensable: !fila.indispensable })}
                  className={`cursor-pointer p-2 rounded-full transition-colors ${
                    fila.indispensable ? 'text-secondary' : 'text-outline'
                  }`}
                >
                  <Icono nombre="priority_high" className="text-base" />
                </button>
                <button
                  type="button"
                  aria-label="Quitar ingrediente"
                  onClick={() => setIngredientes((filas) => filas.filter((_, j) => j !== i))}
                  className="cursor-pointer p-2 text-outline hover:text-error transition-colors"
                >
                  <Icono nombre="close" className="text-base" />
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  setIngredientes((f) => [
                    ...f,
                    { nombre: '', cantidad: 1, unidad: 'ud', indispensable: false },
                  ])
                }
                className="cursor-pointer self-start text-sm text-primary font-semibold flex items-center gap-1 hover:underline"
              >
                <Icono nombre="add" className="text-base" /> Añadir fila
              </button>
              <button
                type="button"
                onClick={() => {
                  setTextoIngredientes(filasATexto(ingredientes));
                  setModoTexto(true);
                }}
                className="cursor-pointer self-start text-sm text-primary font-semibold flex items-center gap-1 hover:underline"
              >
                <Icono nombre="edit_note" className="text-base" /> Seguir escribiendo en texto
              </button>
            </div>
          </>
        )}

        <h3 className="font-serif font-semibold text-xl mt-2">Pasos</h3>
        {pasos.map((paso, i) => (
          <div key={i} className="tarjeta p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-semibold shrink-0">
                {i + 1}
              </span>
              <input
                className={CAMPO}
                placeholder="Título del paso"
                value={paso.titulo}
                onChange={(e) => cambiarPaso(i, { titulo: e.target.value })}
              />
              <button
                type="button"
                aria-label="Quitar paso"
                onClick={() => setPasos((f) => f.filter((_, j) => j !== i))}
                className="cursor-pointer p-2 text-outline hover:text-error transition-colors"
              >
                <Icono nombre="close" className="text-base" />
              </button>
            </div>
            <textarea
              className={CAMPO}
              rows={2}
              placeholder="Descripción detallada del paso"
              value={paso.descripcion}
              onChange={(e) => cambiarPaso(i, { descripcion: e.target.value })}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPasos((f) => [...f, { titulo: '', descripcion: '' }])}
          className="cursor-pointer self-start text-sm text-primary font-semibold flex items-center gap-1 hover:underline"
        >
          <Icono nombre="add" className="text-base" /> Añadir paso
        </button>

        <div className="flex gap-3 mt-4">
          <button type="button" onClick={guardar} className="cursor-pointer flex-1 btn-primario">
            Guardar receta
          </button>
          <button
            type="button"
            onClick={() => navegar(-1)}
            className="cursor-pointer btn-secundario px-6 py-3"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
