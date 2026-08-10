import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { SesionHogar } from '../services/api';

type ModoApp = 'local' | 'familia' | 'sin-elegir';

interface EstadoAuth {
  modo: ModoApp;
  token: string | null;
  hogar: SesionHogar['hogar'] | null;
  usuario: SesionHogar['usuario'] | null;
  version: number;
  sincronizando: boolean;
  ultimoError: string | null;
  ultimoSync: string | null;
  /** Tutorial de bienvenida visible (no se persiste: solo tras entrar). */
  tutorialAbierto: boolean;
  /** Distingue "he creado el hogar" de "me he unido" en el tutorial. */
  hogarRecienCreado: boolean;

  elegirLocal: () => void;
  establecerSesion: (sesion: {
    token: string;
    hogar: SesionHogar['hogar'];
    usuario: SesionHogar['usuario'];
    version: number;
    recienCreado?: boolean;
  }) => void;
  abrirTutorial: () => void;
  cerrarTutorial: () => void;
  fijarVersion: (version: number) => void;
  setSincronizando: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setUltimoSync: (iso: string | null) => void;
  cerrarSesion: () => void;
}

export const useAuthStore = create<EstadoAuth>()(
  persist(
    (set) => ({
      modo: 'sin-elegir',
      token: null,
      hogar: null,
      usuario: null,
      version: 0,
      sincronizando: false,
      ultimoError: null,
      ultimoSync: null,
      tutorialAbierto: false,
      hogarRecienCreado: false,

      elegirLocal: () =>
        set({
          modo: 'local',
          token: null,
          hogar: null,
          usuario: null,
          version: 0,
          ultimoError: null,
          tutorialAbierto: true,
          hogarRecienCreado: false,
        }),

      establecerSesion: ({ token, hogar, usuario, version, recienCreado = false }) =>
        set({
          modo: 'familia',
          token,
          hogar,
          usuario,
          version,
          ultimoError: null,
          tutorialAbierto: true,
          hogarRecienCreado: recienCreado,
        }),

      abrirTutorial: () => set({ tutorialAbierto: true }),
      cerrarTutorial: () => set({ tutorialAbierto: false }),

      fijarVersion: (version) => set({ version }),
      setSincronizando: (sincronizando) => set({ sincronizando }),
      setError: (ultimoError) => set({ ultimoError }),
      setUltimoSync: (ultimoSync) => set({ ultimoSync }),

      cerrarSesion: () =>
        set({
          modo: 'sin-elegir',
          token: null,
          hogar: null,
          usuario: null,
          version: 0,
          sincronizando: false,
          ultimoError: null,
          ultimoSync: null,
          tutorialAbierto: false,
          hogarRecienCreado: false,
        }),
    }),
    {
      name: 'cocinita-auth',
      partialize: (s) => ({
        modo: s.modo,
        token: s.token,
        hogar: s.hogar,
        usuario: s.usuario,
        version: s.version,
      }),
    },
  ),
);
