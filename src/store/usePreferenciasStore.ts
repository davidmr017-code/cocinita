import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Idioma } from '../i18n/diccionario';

type PreferenciasState = {
  idioma: Idioma;
  fijarIdioma: (idioma: Idioma) => void;
};

export const usePreferenciasStore = create<PreferenciasState>()(
  persist(
    (set) => ({
      idioma: 'es',
      fijarIdioma: (idioma) => set({ idioma }),
    }),
    { name: 'cocinita-prefs' },
  ),
);
