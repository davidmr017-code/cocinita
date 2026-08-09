/**
 * Parseo de captions / textos de recetas pegados desde Instagram, TikTok o Facebook.
 * No descarga el post (las redes bloquean eso en el cliente): el usuario pega
 * URL + texto de la publicación (+ vídeo si lo tiene).
 */
import type { Dificultad, PasoReceta } from '../domain/tipos';
import { normalizar } from '../domain/utilidades';
import { parsearTextoIngredientes, type IngredienteParseado } from './parsearIngredientes';

export type RedSocial = 'instagram' | 'tiktok' | 'facebook' | 'otra';

export interface RecetaImportada {
  titulo: string;
  descripcion: string;
  raciones: number;
  tiempoMin: number;
  dificultad: Dificultad;
  etiquetas: string[];
  ingredientes: IngredienteParseado[];
  pasos: PasoReceta[];
  videoUrl?: string;
  origenUrl?: string;
  red: RedSocial;
}

export function detectarRed(url: string): RedSocial {
  const u = url.toLowerCase();
  if (u.includes('instagram.com') || u.includes('instagr.am')) return 'instagram';
  if (u.includes('tiktok.com') || u.includes('vm.tiktok.com')) return 'tiktok';
  if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com')) return 'facebook';
  return 'otra';
}

function extraerRaciones(texto: string): number | null {
  const m = texto.match(/(?:para|raciones?|personas?|comensales?)\s*:?\s*(\d{1,2})/i)
    ?? texto.match(/(\d{1,2})\s*(?:raciones?|personas?|comensales?)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 24 ? n : null;
}

function extraerTiempo(texto: string): number | null {
  const horas = texto.match(/(\d+)\s*h(?:oras?)?\b/i);
  const mins = texto.match(/(\d+)\s*min(?:utos?)?\b/i);
  let total = 0;
  if (horas) total += parseInt(horas[1], 10) * 60;
  if (mins) total += parseInt(mins[1], 10);
  return total > 0 ? total : null;
}

function dividirSecciones(texto: string): { ingredientes: string; pasos: string; resto: string } {
  const limpio = texto.replace(/\r\n/g, '\n').trim();

  // Buscar encabezados típicos
  const reIng = /(?:^|\n)\s*(?:🛒\s*)?(?:ingredientes?|ingredients?)\s*:?\s*\n/i;
  const rePasos =
    /(?:^|\n)\s*(?:👩‍🍳\s*|👨‍🍳\s*)?(?:preparaci[oó]n|elaboraci[oó]n|pasos?|instrucciones?|modo de preparaci[oó]n|c[oó]mo se hace|steps?|method|directions?)\s*:?\s*\n/i;

  const idxIng = limpio.search(reIng);
  const idxPasos = limpio.search(rePasos);

  if (idxIng >= 0 && idxPasos >= 0) {
    if (idxIng < idxPasos) {
      const despuesIng = limpio.slice(idxIng).replace(reIng, '');
      const corte = despuesIng.search(rePasos);
      const bloqueIng = corte >= 0 ? despuesIng.slice(0, corte) : despuesIng;
      const bloquePasos = corte >= 0 ? despuesIng.slice(corte).replace(rePasos, '') : '';
      return {
        ingredientes: bloqueIng.trim(),
        pasos: bloquePasos.trim(),
        resto: limpio.slice(0, idxIng).trim(),
      };
    }
    // Pasos antes que ingredientes (raro)
    const despuesPasos = limpio.slice(idxPasos).replace(rePasos, '');
    const corte = despuesPasos.search(reIng);
    return {
      pasos: (corte >= 0 ? despuesPasos.slice(0, corte) : despuesPasos).trim(),
      ingredientes: (corte >= 0 ? despuesPasos.slice(corte).replace(reIng, '') : '').trim(),
      resto: limpio.slice(0, idxPasos).trim(),
    };
  }

  if (idxIng >= 0) {
    const despues = limpio.slice(idxIng).replace(reIng, '');
    // Heurística: líneas con números al inicio = pasos; con cantidades = ingredientes
    return { ingredientes: despues.trim(), pasos: '', resto: limpio.slice(0, idxIng).trim() };
  }

  if (idxPasos >= 0) {
    return {
      ingredientes: '',
      pasos: limpio.slice(idxPasos).replace(rePasos, '').trim(),
      resto: limpio.slice(0, idxPasos).trim(),
    };
  }

  // Sin encabezados: separar por heurística
  return separarPorHeuristica(limpio);
}

function separarPorHeuristica(texto: string): {
  ingredientes: string;
  pasos: string;
  resto: string;
} {
  const lineas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  const ing: string[] = [];
  const pasos: string[] = [];
  const resto: string[] = [];

  for (const linea of lineas) {
    const esPasoNum = /^\d+[\).:\-]\s+\S/.test(linea);
    const pareceIng =
      /^[-*•·]/.test(linea) ||
      /^([\d.,]+|\d\/\d|[½¼¾⅓⅔])\s*(kg|g|gr|ml|l|cda|cdta|ud)?\b/i.test(linea);

    if (esPasoNum) pasos.push(linea);
    else if (pareceIng) ing.push(linea);
    else if (pasos.length > 0) pasos.push(linea);
    else if (ing.length > 0 && linea.length < 80) ing.push(linea);
    else resto.push(linea);
  }

  return {
    ingredientes: ing.join('\n'),
    pasos: pasos.join('\n'),
    resto: resto.join('\n'),
  };
}

function parsearPasos(texto: string): PasoReceta[] {
  if (!texto.trim()) return [];

  // Separar por líneas numeradas o por dobles saltos
  const bloques = texto
    .split(/\n(?=\d+[\).:\-]\s)/)
    .map((b) => b.trim())
    .filter(Boolean);

  const candidatos = bloques.length > 1 ? bloques : texto.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  return candidatos.map((bloque, i) => {
    let cuerpo = bloque.replace(/^\d+[\).:\-]\s*/, '').trim();
    // Primera frase corta como título
    const punto = cuerpo.search(/[.!?]\s/);
    let titulo = `Paso ${i + 1}`;
    let descripcion = cuerpo;
    if (punto > 0 && punto < 60) {
      titulo = cuerpo.slice(0, punto).trim();
      descripcion = cuerpo.slice(punto + 1).trim() || cuerpo;
    } else if (cuerpo.length <= 50 && !cuerpo.includes('\n')) {
      titulo = cuerpo;
      descripcion = cuerpo;
    } else {
      const primeraLinea = cuerpo.split('\n')[0];
      if (primeraLinea.length <= 55) {
        titulo = primeraLinea;
        descripcion = cuerpo.slice(primeraLinea.length).trim() || primeraLinea;
      }
    }
    return { titulo, descripcion };
  });
}

function extraerTitulo(resto: string, primeraLineaTexto: string): string {
  const lineas = resto.split('\n').map((l) => l.trim()).filter(Boolean);
  // Quitar hashtags y menciones de la primera línea candidata
  for (const linea of lineas.slice(0, 4)) {
    const limpia = linea
      .replace(/#[\wáéíóúñü]+/gi, '')
      .replace(/@[\w.]+/g, '')
      .replace(/[🍳👨‍🍳👩‍🍳🛒✨🔥❤️]+/gu, '')
      .trim();
    if (limpia.length >= 4 && limpia.length <= 80 && !/^https?:/i.test(limpia)) {
      return limpia;
    }
  }
  const fallback = primeraLineaTexto
    .split('\n')[0]
    ?.replace(/#[\w]+/gi, '')
    .trim();
  return fallback && fallback.length >= 3 ? fallback.slice(0, 80) : 'Receta importada';
}

function extraerEtiquetas(texto: string): string[] {
  const tags = [...texto.matchAll(/#([\wáéíóúñü]+)/gi)].map((m) => normalizar(m[1]));
  const utiles = tags.filter(
    (t) =>
      t.length > 2 &&
      !['receta', 'recipe', 'food', 'comida', 'cocina', 'fyp', 'viral', 'reels'].includes(t),
  );
  return [...new Set(utiles)].slice(0, 8);
}

function inferirDificultad(pasos: PasoReceta[], tiempoMin: number): Dificultad {
  if (pasos.length >= 8 || tiempoMin >= 90) return 'dificil';
  if (pasos.length >= 4 || tiempoMin >= 40) return 'media';
  return 'facil';
}

/**
 * Convierte caption + URLs opcionales en una receta estructurada editable.
 */
export function parsearPublicacionSocial(opciones: {
  texto: string;
  urlPublicacion?: string;
  urlVideo?: string;
}): RecetaImportada {
  const texto = opciones.texto.trim();
  if (!texto) {
    return {
      titulo: 'Receta importada',
      descripcion: '',
      raciones: 2,
      tiempoMin: 30,
      dificultad: 'facil',
      etiquetas: [],
      ingredientes: [],
      pasos: [],
      videoUrl: opciones.urlVideo?.trim() || undefined,
      origenUrl: opciones.urlPublicacion?.trim() || undefined,
      red: detectarRed(opciones.urlPublicacion ?? ''),
    };
  }

  const { ingredientes: bloqueIng, pasos: bloquePasos, resto } = dividirSecciones(texto);
  const ingredientes = parsearTextoIngredientes(bloqueIng || '');
  // Si no hubo bloque de ingredientes, intentar parsear todo buscando líneas con cantidades
  const ingredientesFinal =
    ingredientes.length > 0
      ? ingredientes
      : parsearTextoIngredientes(
          texto
            .split('\n')
            .filter((l) => /^[-*•·]?\s*([\d.,]+|\d\/\d|[½¼¾])/.test(l.trim()))
            .join('\n'),
        );

  const pasos = parsearPasos(bloquePasos);
  const raciones = extraerRaciones(texto) ?? 2;
  const tiempoMin = extraerTiempo(texto) ?? Math.max(15, pasos.length * 8);
  const titulo = extraerTitulo(resto, texto);
  const descripcion = resto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== titulo && !l.startsWith('#') && !/^https?:/i.test(l))
    .slice(0, 3)
    .join(' ')
    .slice(0, 280);

  const videoUrl =
    opciones.urlVideo?.trim() ||
    // A veces el usuario pega el enlace del vídeo en el propio texto
    texto.match(/https?:\/\/\S+\.(?:mp4|m3u8)\S*/i)?.[0] ||
    undefined;

  return {
    titulo,
    descripcion,
    raciones,
    tiempoMin,
    dificultad: inferirDificultad(pasos, tiempoMin),
    etiquetas: extraerEtiquetas(texto),
    ingredientes: ingredientesFinal,
    pasos:
      pasos.length > 0
        ? pasos
        : [{ titulo: 'Preparación', descripcion: 'Sigue el vídeo de la publicación paso a paso.' }],
    videoUrl,
    origenUrl: opciones.urlPublicacion?.trim() || undefined,
    red: detectarRed(opciones.urlPublicacion ?? ''),
  };
}
