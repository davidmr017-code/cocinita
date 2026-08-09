import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { aFechaISO } from '../domain/utilidades';
import { IDIOMAS, type Idioma } from '../i18n/diccionario';
import { useTraduccion } from '../i18n/useTraduccion';
import { type DatosBackup, useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { forzarSync } from '../store/sync';
import { EncabezadoPagina } from '../components/EncabezadoPagina';
import { Icono } from '../components/Icono';

const VERSION_BACKUP = 4;

function esBackupValido(datos: unknown): datos is DatosBackup {
  if (!datos || typeof datos !== 'object') return false;
  const o = datos as Record<string, unknown>;
  const perfilOk =
    o.perfil === undefined ||
    (typeof o.perfil === 'object' &&
      o.perfil !== null &&
      Array.isArray((o.perfil as { miembros?: unknown }).miembros));
  const gastosOk = o.gastos === undefined || Array.isArray(o.gastos);
  return (
    Array.isArray(o.ingredientes) &&
    Array.isArray(o.recetas) &&
    Array.isArray(o.despensa) &&
    Array.isArray(o.movimientos) &&
    Array.isArray(o.listaCompra) &&
    Array.isArray(o.menu) &&
    Array.isArray(o.amigos) &&
    Array.isArray(o.feed) &&
    Array.isArray(o.solicitudes) &&
    perfilOk &&
    gastosOk
  );
}

/**
 * AJUSTES — idioma, copia de seguridad local y restablecimiento de datos.
 */
export function PantallaAjustes() {
  const { t, idioma, fijarIdioma, locale } = useTraduccion();
  const estado = useAppStore();
  const importarDatos = useAppStore((s) => s.importarDatos);
  const restablecerDatos = useAppStore((s) => s.restablecerDatos);
  const modo = useAuthStore((s) => s.modo);
  const hogar = useAuthStore((s) => s.hogar);
  const usuario = useAuthStore((s) => s.usuario);
  const ultimoSync = useAuthStore((s) => s.ultimoSync);
  const sincronizando = useAuthStore((s) => s.sincronizando);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const inputRef = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const mostrarAviso = (texto: string) => {
    setError(null);
    setAviso(texto);
    setTimeout(() => setAviso(null), 2800);
  };

  const exportar = () => {
    const backup: DatosBackup = {
      version: VERSION_BACKUP,
      exportadoEn: new Date().toISOString(),
      ingredientes: estado.ingredientes,
      recetas: estado.recetas,
      despensa: estado.despensa,
      movimientos: estado.movimientos,
      listaCompra: estado.listaCompra,
      menu: estado.menu,
      amigos: estado.amigos,
      feed: estado.feed,
      solicitudes: estado.solicitudes,
      perfil: estado.perfil,
      gastos: estado.gastos,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cocinita-backup-${aFechaISO(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarAviso(t('ajustes.backupDescargado'));
  };

  const alImportar = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError(null);
    try {
      const texto = await archivo.text();
      const datos = JSON.parse(texto) as unknown;
      if (!esBackupValido(datos)) {
        setError(t('ajustes.errorBackup'));
        return;
      }
      if (!confirm(t('ajustes.confirmarImportar'))) {
        return;
      }
      importarDatos({
        version: typeof datos.version === 'number' ? datos.version : VERSION_BACKUP,
        exportadoEn:
          typeof datos.exportadoEn === 'string' ? datos.exportadoEn : new Date().toISOString(),
        ingredientes: datos.ingredientes,
        recetas: datos.recetas,
        despensa: datos.despensa,
        movimientos: datos.movimientos,
        listaCompra: datos.listaCompra,
        menu: datos.menu,
        amigos: datos.amigos,
        feed: datos.feed,
        solicitudes: datos.solicitudes,
        perfil: datos.perfil,
        gastos: Array.isArray(datos.gastos) ? datos.gastos : [],
      });
      mostrarAviso(t('ajustes.datosRestaurados'));
    } catch {
      setError(t('ajustes.errorJson'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const restablecer = () => {
    if (!confirm(t('ajustes.confirmarRestablecer'))) {
      return;
    }
    restablecerDatos();
    mostrarAviso(t('ajustes.ejemploRestaurado'));
  };

  const copiarCodigo = async () => {
    if (!hogar?.codigo) return;
    try {
      await navigator.clipboard.writeText(hogar.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError(t('ajustes.errorCopiar'));
    }
  };

  const salirDelHogar = () => {
    if (!confirm(t('ajustes.confirmarSalir'))) {
      return;
    }
    cerrarSesion();
  };

  const etiquetaIdioma = (id: Idioma) =>
    id === 'es' ? t('ajustes.espanol') : t('ajustes.turco');

  return (
    <div className="max-w-lg mx-auto">
      <EncabezadoPagina
        titulo={t('ajustes.titulo')}
        subtitulo={modo === 'familia' ? t('ajustes.subFamilia') : t('ajustes.subLocal')}
      />

      {modo === 'familia' && hogar && usuario && (
        <section className="tarjeta p-4 mb-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
              <Icono nombre="cloud_sync" className="text-primary text-xl" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base">{hogar.nombre}</h3>
              <p className="text-sm text-on-surface-variant mt-0.5">
                {t('ajustes.entrasteComo')}{' '}
                <span className="font-semibold text-on-surface">{usuario.nombre}</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-surface-container px-3 py-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                {t('ajustes.codigoHogar')}
              </p>
              <p className="text-xl font-bold tracking-widest text-primary">{hogar.codigo}</p>
            </div>
            <button type="button" onClick={() => void copiarCodigo()} className="btn-secundario">
              <Icono nombre={copiado ? 'check' : 'content_copy'} />
              {copiado ? t('ajustes.copiado') : t('ajustes.copiar')}
            </button>
          </div>

          <p className="text-xs text-on-surface-variant">
            {sincronizando
              ? t('ajustes.sincronizando')
              : ultimoSync
                ? t('ajustes.ultimaSync', {
                    fecha: new Date(ultimoSync).toLocaleString(locale),
                  })
                : t('ajustes.syncAuto')}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void forzarSync().then(() => mostrarAviso(t('ajustes.sincronizado')))}
              className="btn-secundario"
            >
              <Icono nombre="sync" /> {t('ajustes.syncAhora')}
            </button>
            <button
              type="button"
              onClick={salirDelHogar}
              className="cursor-pointer px-4 py-2.5 rounded-xl border border-error/40 text-sm font-semibold text-error hover:bg-error-container/40 transition-colors flex items-center gap-2"
            >
              <Icono nombre="logout" /> {t('ajustes.salirHogar')}
            </button>
          </div>
        </section>
      )}

      {modo === 'local' && (
        <section className="tarjeta p-4 mb-4">
          <p className="text-sm text-on-surface-variant">
            {t('ajustes.modoLocal')}{' '}
            <button
              type="button"
              onClick={() => cerrarSesion()}
              className="cursor-pointer text-primary font-semibold underline"
            >
              {t('ajustes.conectarHogar')}
            </button>
          </p>
        </section>
      )}

      <section className="tarjeta p-4 mb-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
            <Icono nombre="translate" className="text-primary text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{t('ajustes.idioma')}</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">{t('ajustes.idiomaSub')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {IDIOMAS.map((op) => {
            const activo = idioma === op.id;
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => fijarIdioma(op.id)}
                aria-pressed={activo}
                className={`cursor-pointer flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  activo
                    ? 'bg-primary text-on-primary border-primary'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface'
                }`}
              >
                {etiquetaIdioma(op.id)}
                <span className="block text-[10px] font-medium opacity-80 mt-0.5">
                  {op.etiquetaNativa}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <Link
        to="/perfil"
        className="tarjeta p-4 mb-4 flex items-center gap-3 hover:border-primary-fixed-dim transition-colors cursor-pointer"
      >
        <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0">
          <Icono nombre="family_restroom" className="text-secondary text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{t('ajustes.perfilTitulo')}</h3>
          <p className="text-sm text-on-surface-variant">{t('ajustes.perfilSub')}</p>
        </div>
        <Icono nombre="chevron_right" className="text-on-surface-variant" />
      </Link>

      <Link
        to="/gastos"
        className="tarjeta p-4 mb-4 flex items-center gap-3 hover:border-primary-fixed-dim transition-colors cursor-pointer"
      >
        <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
          <Icono nombre="receipt_long" className="text-primary text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{t('ajustes.gastosTitulo')}</h3>
          <p className="text-sm text-on-surface-variant">{t('ajustes.gastosSub')}</p>
        </div>
        <Icono nombre="chevron_right" className="text-on-surface-variant" />
      </Link>

      <section className="tarjeta p-4 mb-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
            <Icono nombre="cloud_download" className="text-primary text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{t('ajustes.exportar')}</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">{t('ajustes.exportarSub')}</p>
          </div>
        </div>
        <button type="button" onClick={exportar} className="btn-primario self-start">
          <Icono nombre="download" /> {t('ajustes.descargar')}
        </button>
      </section>

      <section className="tarjeta p-4 mb-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0">
            <Icono nombre="upload_file" className="text-secondary text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{t('ajustes.importar')}</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">{t('ajustes.importarSub')}</p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => alImportar(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-secundario self-start"
        >
          <Icono nombre="folder_open" /> {t('ajustes.elegirJson')}
        </button>
      </section>

      <section className="tarjeta p-4 mb-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center shrink-0">
            <Icono nombre="restart_alt" className="text-error text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{t('ajustes.restablecerTitulo')}</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">{t('ajustes.restablecerSub')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={restablecer}
          className="cursor-pointer self-start px-4 py-2.5 rounded-xl border border-error/40 text-sm font-semibold text-error hover:bg-error-container/40 transition-colors flex items-center gap-2"
        >
          <Icono nombre="delete_forever" /> {t('ajustes.restablecer')}
        </button>
      </section>

      <p className="text-xs text-on-surface-variant text-center px-4">
        {modo === 'familia' ? t('ajustes.pieFamilia') : t('ajustes.pieLocal')}
      </p>

      {aviso && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl text-sm z-50 sombra-cocina">
          {aviso}
        </div>
      )}
      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-error-container text-on-error-container px-5 py-3 rounded-xl text-sm z-50 sombra-cocina max-w-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
