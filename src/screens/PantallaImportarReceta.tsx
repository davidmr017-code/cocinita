import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Dificultad, PasoReceta, Receta } from '../domain/tipos';
import { baseDe } from '../domain/unidades';
import { nuevoId } from '../domain/utilidades';
import { useAppStore } from '../store/useAppStore';
import { detectarRed, parsearPublicacionSocial } from '../services/parsearRecetaSocial';
import { useTraduccion } from '../i18n/useTraduccion';
import { EncabezadoPagina } from '../components/EncabezadoPagina';
import { Icono } from '../components/Icono';

/**
 * Importar receta desde Instagram / TikTok / Facebook.
 * El usuario pega la URL + el texto de la publicación (caption).
 * Cocinita detecta ingredientes, pasos y enlaza el vídeo.
 */
export function PantallaImportarReceta() {
  const { t } = useTraduccion();
  const navegar = useNavigate();
  const guardarReceta = useAppStore((s) => s.guardarReceta);
  const asegurarIngrediente = useAppStore((s) => s.asegurarIngrediente);

  const [urlPublicacion, setUrlPublicacion] = useState('');
  const [urlVideo, setUrlVideo] = useState('');
  const [texto, setTexto] = useState('');
  const [vistaPrevia, setVistaPrevia] = useState(false);

  const parseada = useMemo(
    () =>
      vistaPrevia
        ? parsearPublicacionSocial({
            texto,
            urlPublicacion,
            urlVideo,
          })
        : null,
    [vistaPrevia, texto, urlPublicacion, urlVideo],
  );

  const redDetectada = detectarRed(urlPublicacion);

  const analizar = () => {
    if (!texto.trim()) {
      alert('Pega el texto (caption) de la publicación para poder detectar ingredientes y pasos.');
      return;
    }
    setVistaPrevia(true);
  };

  const guardar = () => {
    if (!parseada) return;
    if (parseada.ingredientes.length === 0) {
      alert('No se detectaron ingredientes. Revisa el texto o edítalo antes de guardar.');
      return;
    }

    const receta: Receta = {
      id: nuevoId(),
      titulo: parseada.titulo,
      descripcion: parseada.descripcion,
      videoUrl: parseada.videoUrl,
      origenUrl: parseada.origenUrl,
      raciones: parseada.raciones,
      tiempoMin: parseada.tiempoMin,
      dificultad: parseada.dificultad as Dificultad,
      etiquetas: [
        ...parseada.etiquetas,
        parseada.red !== 'otra' ? parseada.red : '',
        'importada',
      ].filter(Boolean),
      ingredientes: parseada.ingredientes.map((ing) => ({
        ingredienteId: asegurarIngrediente(ing.nombre, 'otros', baseDe(ing.unidad)),
        cantidad: ing.cantidad,
        unidad: ing.unidad,
        indispensable: true,
      })),
      pasos: parseada.pasos as PasoReceta[],
      favorita: false,
      origen: 'descubierta',
      aprendida: false,
      creadaEn: new Date().toISOString(),
    };

    guardarReceta(receta);
    navegar(`/receta/${receta.id}/editar`);
  };

  const ejemplo = () => {
    setUrlPublicacion('https://www.instagram.com/reel/ejemplo/');
    setUrlVideo('');
    setTexto(`Pasta cremosa de tomate 🍅

La cena de los miércoles en casa. Para 4 personas · 25 min

Ingredientes:
- 400 g de pasta
- 3 tomates maduros
- 2 dientes de ajo
- 200 ml de nata
- 2 cda de aceite de oliva
- sal al gusto
- albahaca fresca

Preparación:
1. Hierve la pasta en agua con sal.
2. Sofríe el ajo y los tomates troceados.
3. Añade la nata y cocina 5 minutos.
4. Mezcla con la pasta y corona con albahaca.

#pasta #receta #casero`);
    setVistaPrevia(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <EncabezadoPagina
        titulo={t('importar.titulo')}
        subtitulo={t('importar.subtitulo')}
      />

      <div className="tarjeta p-4 mb-4 text-sm text-on-surface-variant flex gap-2">
        <Icono nombre="info" className="text-primary shrink-0" />
        <p>
          Instagram, TikTok y Facebook no permiten leer publicaciones automáticamente desde la app.
          Copia el <strong>texto de la descripción</strong> (y la URL del post o del vídeo) y pégalo
          aquí. Nosotros detectamos ingredientes, pasos y vinculamos el vídeo.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <label className="text-xs font-bold text-on-surface-variant">
          URL de la publicación
          <input
            className="campo text-sm mt-1 font-normal"
            value={urlPublicacion}
            onChange={(e) => setUrlPublicacion(e.target.value)}
            placeholder="https://www.instagram.com/reel/… o tiktok.com/…"
          />
        </label>
        {urlPublicacion && (
          <p className="text-xs text-primary font-semibold capitalize">
            Red detectada: {redDetectada === 'otra' ? 'enlace genérico' : redDetectada}
          </p>
        )}

        <label className="text-xs font-bold text-on-surface-variant">
          URL del vídeo (opcional, mp4 o enlace embebible)
          <input
            className="campo text-sm mt-1 font-normal"
            value={urlVideo}
            onChange={(e) => setUrlVideo(e.target.value)}
            placeholder="https://…/video.mp4"
          />
        </label>

        <label className="text-xs font-bold text-on-surface-variant">
          Texto de la publicación (caption)
          <textarea
            className="campo text-sm mt-1 font-normal min-h-[220px]"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setVistaPrevia(false);
            }}
            placeholder={`Pega aquí el caption, por ejemplo:\n\nIngredientes:\n- 200 g de…\n\nPreparación:\n1. …`}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button type="button" onClick={analizar} className="btn-primario">
          <Icono nombre="auto_awesome" /> Analizar y previsualizar
        </button>
        <button type="button" onClick={ejemplo} className="btn-secundario">
          Cargar ejemplo
        </button>
        <button type="button" onClick={() => navegar(-1)} className="btn-secundario">
          Cancelar
        </button>
      </div>

      {parseada && (
        <div className="tarjeta p-4 flex flex-col gap-4">
          <h3 className="font-serif font-semibold text-xl">Vista previa</h3>
          <div>
            <p className="text-lg font-bold">{parseada.titulo}</p>
            {parseada.descripcion && (
              <p className="text-sm text-on-surface-variant mt-1">{parseada.descripcion}</p>
            )}
            <p className="text-xs text-on-surface-variant mt-2">
              {parseada.raciones} raciones · {parseada.tiempoMin} min · {parseada.dificultad}
              {parseada.videoUrl ? ' · con vídeo' : ''}
              {parseada.origenUrl ? ' · enlace guardado' : ''}
            </p>
          </div>

          <div>
            <p className="text-sm font-bold mb-2">
              Ingredientes detectados ({parseada.ingredientes.length})
            </p>
            {parseada.ingredientes.length === 0 ? (
              <p className="text-xs text-error">
                No se detectaron. Asegúrate de listarlos con cantidades (ej. «200 g de tomate»).
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {parseada.ingredientes.map((ing, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{ing.nombre}</span>
                    <span className="text-on-surface-variant tabular-nums shrink-0">
                      {ing.cantidad} {ing.unidad}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-sm font-bold mb-2">Pasos ({parseada.pasos.length})</p>
            <ol className="flex flex-col gap-2 text-sm list-decimal pl-5">
              {parseada.pasos.map((paso, i) => (
                <li key={i}>
                  <strong>{paso.titulo}</strong>
                  {paso.descripcion !== paso.titulo && (
                    <span className="text-on-surface-variant"> — {paso.descripcion}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <button type="button" onClick={guardar} className="btn-primario">
            <Icono nombre="save" /> Crear receta y revisar
          </button>
          <p className="text-xs text-on-surface-variant">
            Se abrirá el editor para que ajustes cantidades, foto o pasos antes de cocinar.
          </p>
        </div>
      )}
    </div>
  );
}
