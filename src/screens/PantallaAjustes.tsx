import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { aFechaISO } from '../domain/utilidades';
import { type DatosBackup, useAppStore } from '../store/useAppStore';
import { EncabezadoPagina } from '../components/EncabezadoPagina';
import { Icono } from '../components/Icono';

const VERSION_BACKUP = 3;

function esBackupValido(datos: unknown): datos is DatosBackup {
  if (!datos || typeof datos !== 'object') return false;
  const o = datos as Record<string, unknown>;
  const perfilOk =
    o.perfil === undefined ||
    (typeof o.perfil === 'object' &&
      o.perfil !== null &&
      Array.isArray((o.perfil as { miembros?: unknown }).miembros));
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
    perfilOk
  );
}

/**
 * AJUSTES — copia de seguridad local y restablecimiento de datos.
 */
export function PantallaAjustes() {
  const estado = useAppStore();
  const importarDatos = useAppStore((s) => s.importarDatos);
  const restablecerDatos = useAppStore((s) => s.restablecerDatos);
  const inputRef = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-lg mx-auto">
      <EncabezadoPagina
        titulo="Ajustes"
        subtitulo="Copia de seguridad y datos locales de Cocinita."
      />

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
        Todo se guarda en este dispositivo (localStorage). Un backup te permite cambiar de móvil
        o recuperar datos si borras el almacenamiento del navegador.
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
