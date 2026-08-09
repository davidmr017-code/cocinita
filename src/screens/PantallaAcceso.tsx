import { useState } from 'react';

import { crearHogar, unirseHogar } from '../services/api';
import { DATOS_SEED } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { aplicarEstadoRemoto, extraerEstadoApp } from '../store/sync';
import { useTraduccion } from '../i18n/useTraduccion';
import { EncabezadoPagina } from '../components/EncabezadoPagina';
import { Icono } from '../components/Icono';

type Pestaña = 'crear' | 'unirse';

/**
 * Acceso familiar: crear hogar o unirse con código (Postgres / Railway).
 */
export function PantallaAcceso() {
  const { t } = useTraduccion();
  const elegirLocal = useAuthStore((s) => s.elegirLocal);
  const establecerSesion = useAuthStore((s) => s.establecerSesion);

  const [pestaña, setPestaña] = useState<Pestaña>('crear');
  const [nombreHogar, setNombreHogar] = useState('Casa');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [conEjemplo, setConEjemplo] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await crearHogar({
        nombreHogar,
        nombreUsuario,
        pin: pin || undefined,
        conDatosEjemplo: conEjemplo,
        estado: conEjemplo ? (DATOS_SEED as ReturnType<typeof extraerEstadoApp>) : undefined,
      });
      aplicarEstadoRemoto(res.estado);
      establecerSesion({
        token: res.token,
        hogar: res.hogar,
        usuario: res.usuario,
        version: res.version,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el hogar');
    } finally {
      setCargando(false);
    }
  };

  const unirse = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await unirseHogar({
        codigo,
        nombreUsuario,
        pin: pin || undefined,
      });
      aplicarEstadoRemoto(res.estado);
      establecerSesion({
        token: res.token,
        hogar: res.hogar,
        usuario: res.usuario,
        version: res.version,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo unir al hogar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6">
      <EncabezadoPagina
        titulo={t('acceso.titulo')}
        subtitulo={t('acceso.subtitulo')}
      />

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setPestaña('crear')}
          className={`cursor-pointer flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
            pestaña === 'crear'
              ? 'bg-primary text-on-primary border-primary'
              : 'border-outline-variant bg-surface-container-lowest'
          }`}
        >
          {t('acceso.crear')}
        </button>
        <button
          type="button"
          onClick={() => setPestaña('unirse')}
          className={`cursor-pointer flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
            pestaña === 'unirse'
              ? 'bg-primary text-on-primary border-primary'
              : 'border-outline-variant bg-surface-container-lowest'
          }`}
        >
          {t('acceso.unirme')}
        </button>
      </div>

      <div className="tarjeta p-4 flex flex-col gap-3">
        {pestaña === 'crear' && (
          <label className="text-xs font-bold text-on-surface-variant">
            {t('acceso.nombreHogar')}
            <input
              className="campo text-sm mt-1 font-normal"
              value={nombreHogar}
              onChange={(e) => setNombreHogar(e.target.value)}
              placeholder="Casa de los Moreno"
            />
          </label>
        )}

        {pestaña === 'unirse' && (
          <label className="text-xs font-bold text-on-surface-variant">
            {t('acceso.codigo')}
            <input
              className="campo text-sm mt-1 font-normal uppercase tracking-wider"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="COCI-XXXX"
            />
          </label>
        )}

        <label className="text-xs font-bold text-on-surface-variant">
          {t('acceso.tuNombre')}
          <input
            className="campo text-sm mt-1 font-normal"
            value={nombreUsuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
            placeholder="David"
          />
        </label>

        <label className="text-xs font-bold text-on-surface-variant">
          {t('acceso.pin')}
          <input
            className="campo text-sm mt-1 font-normal"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            inputMode="numeric"
            placeholder="4–8"
            maxLength={8}
          />
        </label>

        {pestaña === 'crear' && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={conEjemplo}
              onChange={(e) => setConEjemplo(e.target.checked)}
              className="accent-primary"
            />
            {t('acceso.conEjemplos')}
          </label>
        )}

        {error && (
          <p className="text-sm text-error bg-error-container/50 rounded-xl px-3 py-2">{error}</p>
        )}

        <button
          type="button"
          disabled={cargando || !nombreUsuario.trim() || (pestaña === 'unirse' && !codigo.trim())}
          onClick={() => void (pestaña === 'crear' ? crear() : unirse())}
          className="btn-primario disabled:opacity-40"
        >
          <Icono nombre={pestaña === 'crear' ? 'home' : 'login'} />
          {cargando
            ? t('comun.cargar')
            : pestaña === 'crear'
              ? t('acceso.crearEntrar')
              : t('acceso.entrar')}
        </button>
      </div>

      <button
        type="button"
        onClick={() => elegirLocal()}
        className="cursor-pointer mt-6 w-full text-sm text-on-surface-variant font-semibold hover:text-primary underline"
      >
        {t('acceso.soloLocal')}
      </button>

      <p className="text-xs text-on-surface-variant text-center mt-4 px-2">
        Al crear un hogar verás un código (COCI-XXXX). Compártelo con tu familia para que se unan
        desde sus móviles.
      </p>
    </div>
  );
}
