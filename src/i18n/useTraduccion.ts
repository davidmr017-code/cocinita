import { useCallback, useMemo } from 'react';

import { usePreferenciasStore } from '../store/usePreferenciasStore';
import { DICCIONARIOS, localeDeIdioma, type Diccionario, type Idioma } from './diccionario';

type Params = Record<string, string | number>;

type Rutas =
  | `comun.${keyof Diccionario['comun']}`
  | `nav.${keyof Diccionario['nav']}`
  | `barra.${keyof Diccionario['barra']}`
  | `sync.${keyof Diccionario['sync']}`
  | `explorar.${keyof Diccionario['explorar']}`
  | `recetas.${keyof Diccionario['recetas']}`
  | `despensa.${keyof Diccionario['despensa']}`
  | `compra.${keyof Diccionario['compra']}`
  | `gastos.${keyof Diccionario['gastos']}`
  | `chef.${keyof Diccionario['chef']}`
  | `menu.${keyof Diccionario['menu']}`
  | `amigos.${keyof Diccionario['amigos']}`
  | `escaner.${keyof Diccionario['escaner']}`
  | `perfil.${keyof Diccionario['perfil']}`
  | `acceso.${keyof Diccionario['acceso']}`
  | `landing.${keyof Diccionario['landing']}`
  | `tutorial.${keyof Diccionario['tutorial']}`
  | `importar.${keyof Diccionario['importar']}`
  | `detalle.${keyof Diccionario['detalle']}`
  | `ajustes.${keyof Diccionario['ajustes']}`;

function resolver(dic: Diccionario, clave: Rutas): string {
  const [seccion, campo] = clave.split('.') as [keyof Diccionario, string];
  const bloque = dic[seccion] as Record<string, string>;
  return bloque?.[campo] ?? clave;
}

function interpolar(texto: string, params?: Params): string {
  if (!params) return texto;
  return texto.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

export function useTraduccion() {
  const idioma = usePreferenciasStore((s) => s.idioma);
  const fijarIdioma = usePreferenciasStore((s) => s.fijarIdioma);

  const dic = DICCIONARIOS[idioma];

  const t = useCallback(
    (clave: Rutas, params?: Params) => interpolar(resolver(dic, clave), params),
    [dic],
  );

  const locale = useMemo(() => localeDeIdioma(idioma), [idioma]);

  return { t, idioma, fijarIdioma, locale } as {
    t: (clave: Rutas, params?: Params) => string;
    idioma: Idioma;
    fijarIdioma: (idioma: Idioma) => void;
    locale: string;
  };
}
