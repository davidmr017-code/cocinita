/**
 * OCR de tickets con Tesseract (español), cargado bajo demanda.
 */
import { parsearTextoTicket } from './gastos';

export type ResultadoOcrTicket = {
  texto: string;
  comercio?: string;
  total?: number;
  fecha?: string;
};

/** Lee una foto de ticket (data URL o blob URL) y sugiere campos. */
export async function leerTicketDesdeImagen(
  imagen: string,
  onProgreso?: (pct: number) => void,
): Promise<ResultadoOcrTicket> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('spa', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgreso?.(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(imagen);
    const parseado = parsearTextoTicket(text);
    return { texto: text, ...parseado };
  } finally {
    await worker.terminate();
  }
}
