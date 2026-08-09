import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { tiempoRelativo } from '../domain/utilidades';
import { useAppStore } from '../store/useAppStore';
import { Icono } from '../components/Icono';
import { useTraduccion } from '../i18n/useTraduccion';
import { EncabezadoPagina } from '../components/EncabezadoPagina';

export function PantallaAmigos() {
  const { t } = useTraduccion();
  const amigos = useAppStore((s) => s.amigos);
  const feed = useAppStore((s) => s.feed);
  const solicitudes = useAppStore((s) => s.solicitudes);
  const recetas = useAppStore((s) => s.recetas);
  const alternarMeGusta = useAppStore((s) => s.alternarMeGusta);
  const pedirReceta = useAppStore((s) => s.pedirReceta);

  const [pidiendoA, setPidiendoA] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');

  const porId = useMemo(() => new Map(amigos.map((a) => [a.id, a])), [amigos]);
  const titulosReceta = useMemo(() => new Map(recetas.map((r) => [r.id, r.titulo])), [recetas]);

  const enviarPeticion = () => {
    if (!pidiendoA || !mensaje.trim()) return;
    pedirReceta(pidiendoA, mensaje.trim());
    setPidiendoA(null);
    setMensaje('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <EncabezadoPagina
        titulo={t('amigos.titulo')}
        subtitulo={t('amigos.subtitulo')}
      />

      <div className="flex gap-4 mb-6 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
        {amigos.map((amigo) => (
          <button
            key={amigo.id}
            type="button"
            onClick={() => setPidiendoA(pidiendoA === amigo.id ? null : amigo.id)}
            className="cursor-pointer flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <img
              src={amigo.avatar}
              alt={amigo.nombre}
              className={`w-16 h-16 rounded-2xl object-cover transition-all ${
                pidiendoA === amigo.id
                  ? 'ring-[3px] ring-primary scale-105'
                  : 'ring-2 ring-outline-variant group-hover:ring-primary-fixed-dim'
              }`}
            />
            <span className="text-xs font-bold">{amigo.nombre}</span>
            <span className="text-[10px] text-primary font-semibold">Pedir receta</span>
          </button>
        ))}
      </div>

      {pidiendoA && (
        <div className="tarjeta p-4 mb-6">
          <p className="text-sm font-bold mb-2">
            Pedir una receta a {porId.get(pidiendoA)?.nombre}
          </p>
          <div className="flex gap-2">
            <input
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviarPeticion()}
              placeholder="¿Me pasas tu receta de…?"
              className="flex-1 campo text-sm"
            />
            <button
              type="button"
              onClick={enviarPeticion}
              aria-label="Enviar petición"
              className="cursor-pointer btn-primario w-11 h-11 p-0 rounded-xl shrink-0"
            >
              <Icono nombre="send" className="text-lg" />
            </button>
          </div>
        </div>
      )}

      {solicitudes.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-bold text-on-surface-variant mb-2">Recetas pedidas</h3>
          <div className="flex flex-col gap-2">
            {solicitudes.map((solicitud) => {
              const amigo = porId.get(solicitud.amigoId);
              return (
                <div key={solicitud.id} className="tarjeta p-3 flex items-center gap-3">
                  <img src={amigo?.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{amigo?.nombre}</p>
                    <p className="text-xs text-on-surface-variant truncate">{solicitud.mensaje}</p>
                  </div>
                  {solicitud.estado === 'recibida' && solicitud.recetaId ? (
                    <Link
                      to={`/receta/${solicitud.recetaId}`}
                      className="cursor-pointer text-xs font-bold etiqueta etiqueta-salvia hover:opacity-90 transition-opacity shrink-0"
                    >
                      Ver «{titulosReceta.get(solicitud.recetaId)}»
                    </Link>
                  ) : (
                    <span className="text-xs text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-lg shrink-0">
                      Pendiente…
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-bold text-on-surface-variant">Qué están cocinando</h3>
        {feed.map((publicacion) => {
          const amigo = porId.get(publicacion.amigoId);
          return (
            <article key={publicacion.id} className="tarjeta overflow-hidden p-0">
              <div className="flex items-center gap-3 p-4 pb-3">
                <img src={amigo?.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <p className="text-sm font-bold">{amigo?.nombre}</p>
                  <p className="text-xs text-on-surface-variant">
                    cocinó «{publicacion.recetaTitulo}» · {tiempoRelativo(publicacion.fecha)}
                  </p>
                </div>
              </div>
              <div
                className="h-52 bg-surface-container bg-cover bg-center"
                style={{ backgroundImage: `url('${publicacion.imagen}')` }}
                role="img"
                aria-label={publicacion.recetaTitulo}
              />
              <div className="p-4 pt-3">
                <p className="text-sm mb-3 leading-relaxed">{publicacion.texto}</p>
                <button
                  type="button"
                  onClick={() => alternarMeGusta(publicacion.id)}
                  className={`cursor-pointer flex items-center gap-1.5 text-sm font-bold transition-colors ${
                    publicacion.meGusta ? 'text-secondary' : 'text-on-surface-variant hover:text-secondary'
                  }`}
                >
                  <Icono nombre="favorite" relleno={publicacion.meGusta} className="text-xl" />
                  {publicacion.likes}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
