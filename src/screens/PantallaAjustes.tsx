import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { aFechaISO } from '../domain/utilidades';
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
 * AJUSTES — copia de seguridad local y restablecimiento de datos.
 */
export function PantallaAjustes() {
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
    mostrarAviso('Copia de seguridad descargada');
  };

  const alImportar = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError(null);
    try {
      const texto = await archivo.text();
      const datos = JSON.parse(texto) as unknown;
      if (!esBackupValido(datos)) {
        setError('El archivo no parece una copia de Cocinita válida.');
        return;
      }
      if (
        !confirm(
          'Esto reemplazará todos tus datos actuales (recetas, despensa, lista…). ¿Continuar?',
        )
      ) {
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
      mostrarAviso('Datos restaurados correctamente');
    } catch {
      setError('No se pudo leer el archivo. ¿Es un JSON válido?');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const restablecer = () => {
    if (
      !confirm(
        'Se borrarán tus cambios y se cargarán de nuevo los datos de ejemplo. ¿Seguro?',
      )
    ) {
      return;
    }
    restablecerDatos();
    mostrarAviso('Datos de ejemplo restaurados');
  };

  const copiarCodigo = async () => {
    if (!hogar?.codigo) return;
    try {
      await navigator.clipboard.writeText(hogar.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar el código');
    }
  };

  const salirDelHogar = () => {
    if (
      !confirm(
        'Saldrás del hogar familiar en este dispositivo. Los datos en la nube no se borran. ¿Continuar?',
      )
    ) {
      return;
    }
    cerrarSesion();
  };

  return (
    <div className="max-w-lg mx-auto">
      <EncabezadoPagina
        titulo="Ajustes"
        subtitulo={
          modo === 'familia'
            ? 'Hogar compartido, sincronización y copias de seguridad.'
            : 'Copia de seguridad y datos locales de Cocinita.'
        }
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
                Entraste como <span className="font-semibold text-on-surface">{usuario.nombre}</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-surface-container px-3 py-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                Código del hogar
              </p>
              <p className="text-xl font-bold tracking-widest text-primary">{hogar.codigo}</p>
            </div>
            <button type="button" onClick={() => void copiarCodigo()} className="btn-secundario">
              <Icono nombre={copiado ? 'check' : 'content_copy'} />
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <p className="text-xs text-on-surface-variant">
            {sincronizando
              ? 'Sincronizando…'
              : ultimoSync
                ? `Última sync: ${new Date(ultimoSync).toLocaleString('es-ES')}`
                : 'Los cambios se suben solos a la nube familiar.'}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void forzarSync().then(() => mostrarAviso('Sincronizado'))}
              className="btn-secundario"
            >
              <Icono nombre="sync" /> Sincronizar ahora
            </button>
            <button
              type="button"
              onClick={salirDelHogar}
              className="cursor-pointer px-4 py-2.5 rounded-xl border border-error/40 text-sm font-semibold text-error hover:bg-error-container/40 transition-colors flex items-center gap-2"
            >
              <Icono nombre="logout" /> Salir del hogar
            </button>
          </div>
        </section>
      )}

      {modo === 'local' && (
        <section className="tarjeta p-4 mb-4">
          <p className="text-sm text-on-surface-variant">
            Estás en modo local (solo este dispositivo).{' '}
            <button
              type="button"
              onClick={() => cerrarSesion()}
              className="cursor-pointer text-primary font-semibold underline"
            >
              Conectar un hogar familiar
            </button>
          </p>
        </section>
      )}

      <Link
        to="/perfil"
        className="tarjeta p-4 mb-4 flex items-center gap-3 hover:border-primary-fixed-dim transition-colors cursor-pointer"
      >
        <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0">
          <Icono nombre="family_restroom" className="text-secondary text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">Perfil del hogar</h3>
          <p className="text-sm text-on-surface-variant">
            Alérgenos, preferencias y miembros de la familia
          </p>
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
          <h3 className="font-semibold text-base">Gastos y tickets</h3>
          <p className="text-sm text-on-surface-variant">
            Escanea tickets y reparte el gasto entre el hogar
          </p>
        </div>
        <Icono nombre="chevron_right" className="text-on-surface-variant" />
      </Link>

      <section className="tarjeta p-4 mb-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
            <Icono nombre="cloud_download" className="text-primary text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Exportar copia</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Descarga un JSON con recetas, despensa, lista y menú. Guárdalo en un sitio seguro.
            </p>
          </div>
        </div>
        <button type="button" onClick={exportar} className="btn-primario self-start">
          <Icono nombre="download" /> Descargar backup
        </button>
      </section>

      <section className="tarjeta p-4 mb-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0">
            <Icono nombre="upload_file" className="text-secondary text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Importar copia</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Restaura un backup anterior. Sustituye por completo los datos actuales.
            </p>
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
          <Icono nombre="folder_open" /> Elegir archivo JSON
        </button>
      </section>

      <section className="tarjeta p-4 mb-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center shrink-0">
            <Icono nombre="restart_alt" className="text-error text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Restablecer datos de ejemplo</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Vuelve al estado inicial de la demo (recetas y despensa de ejemplo).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={restablecer}
          className="cursor-pointer self-start px-4 py-2.5 rounded-xl border border-error/40 text-sm font-semibold text-error hover:bg-error-container/40 transition-colors flex items-center gap-2"
        >
          <Icono nombre="delete_forever" /> Restablecer
        </button>
      </section>

      <p className="text-xs text-on-surface-variant text-center px-4">
        {modo === 'familia'
          ? 'En modo familia los datos viven en Postgres (Railway) y también se cachean en este dispositivo.'
          : 'En modo local todo se guarda en este dispositivo (localStorage). Un backup te permite cambiar de móvil.'}
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
