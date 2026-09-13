/**
 * Recetas con IA (Groq, API compatible con OpenAI).
 * Recibe la despensa y el perfil del hogar y devuelve recetas en JSON.
 *
 * Nota: Groq retiró llama-3.3-70b-versatile / llama-3.1-8b-instant (16 ago 2026).
 * En plan Free el techo TPM (~8k) cuenta prompt + max_tokens de la MISMA petición;
 * si se pasa, Groq responde 413/429 con type=tokens (no es "cuota del día").
 * @see https://console.groq.com/docs/deprecations
 * @see https://console.groq.com/docs/rate-limits
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Modelo por defecto (recomendado por Groq tras retirar Llama 3.3 70B). */
const MODELO_POR_DEFECTO = 'openai/gpt-oss-120b';

/**
 * Techo seguro para Free on_demand (gpt-oss ≈ 8000 TPM).
 * Groq suma tokens del prompt + max_tokens al validar la petición.
 */
const TPM_FREE_SEGURO = 7500;

/** Si en Railway quedó un ID antiguo, lo reescribimos al reemplazo oficial. */
const MODELOS_RETIRADOS = {
  'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
  'llama-3.1-8b-instant': 'openai/gpt-oss-20b',
  'llama-3.1-70b-versatile': 'openai/gpt-oss-120b',
  'llama3-70b-8192': 'openai/gpt-oss-120b',
  'llama3-8b-8192': 'openai/gpt-oss-20b',
  'qwen/qwen3-32b': 'openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct': 'openai/gpt-oss-120b',
};

const MODELOS_RESPALDO = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b'];

/** Lista de modelos a intentar (principal + respaldos), sin duplicados. */
export function resolverModelos(envModel = process.env.GROQ_MODEL) {
  const pedido = String(envModel || '').trim() || MODELO_POR_DEFECTO;
  const principal = MODELOS_RETIRADOS[pedido] || pedido;
  return [...new Set([principal, ...MODELOS_RESPALDO])];
}

export function iaDisponible() {
  return Boolean(process.env.GROQ_API_KEY);
}

/** Estimación barata de tokens (español ≈ 3–4 chars/token). */
export function estimarTokensMensajes(messages) {
  const texto = (messages || []).map((m) => String(m?.content || '')).join('\n');
  return Math.ceil(texto.length / 3.2);
}

/** Ajusta max_tokens para no superar el techo Free TPM de una sola petición. */
export function ajustarMaxTokens(messages, pedido = 2200) {
  const promptTok = estimarTokensMensajes(messages);
  const disponible = TPM_FREE_SEGURO - promptTok;
  if (disponible < 600) {
    // Prompt demasiado grande: aún pedimos un mínimo; la capa superior debe truncar.
    return Math.min(pedido, 600);
  }
  return Math.min(Math.max(600, pedido), disponible);
}

function esErrorModeloInexistente(status, texto) {
  if (status === 404) return true;
  const t = String(texto || '').toLowerCase();
  return (
    t.includes('does not exist') ||
    t.includes('model_not_found') ||
    t.includes('not have access to it') ||
    (t.includes('model') && t.includes('decommissioned'))
  );
}

/** 413 / 429 por tamaño de petición (TPM), no por cuota diaria. */
export function esPeticionDemasiadoGrande(status, texto) {
  const lower = String(texto || '').toLowerCase();
  return (
    status === 413 ||
    lower.includes('request too large') ||
    lower.includes('reduce your message size') ||
    (lower.includes('tokens per minute') && lower.includes('requested')) ||
    (lower.includes('"type":"tokens"') && lower.includes('rate_limit_exceeded') && !lower.includes('per day'))
  );
}

export function esCuotaDiaria(status, texto) {
  if (![429, 413].includes(status)) return false;
  if (esPeticionDemasiadoGrande(status, texto)) return false;
  const lower = String(texto || '').toLowerCase();
  return (
    lower.includes('tokens per day') ||
    lower.includes('requests per day') ||
    /\btpd\b/.test(lower) ||
    /\brpd\b/.test(lower) ||
    (lower.includes('quota') && !lower.includes('minute'))
  );
}

/** Mensaje claro para la UI a partir del cuerpo de error de Groq. */
export function mensajeErrorGroq(status, texto) {
  const t = String(texto || '');

  if (status === 401 || status === 403) return 'Clave de Groq inválida o sin permiso';

  if (esPeticionDemasiadoGrande(status, t)) {
    return 'La petición a la IA es demasiado grande para el plan gratuito. Prueba de nuevo (hemos reducido el tamaño automáticamente).';
  }

  if (status === 429) {
    if (esCuotaDiaria(status, t)) {
      return 'Se agotó la cuota gratuita de hoy en Groq. Prueba mañana.';
    }
    return 'La IA está saturada ahora mismo. Espera un minuto e inténtalo de nuevo.';
  }

  if (esErrorModeloInexistente(status, t)) {
    return 'El modelo de IA ya no está disponible en Groq. Revisa GROQ_MODEL en Railway.';
  }

  return 'El servicio de IA no respondió. Inténtalo de nuevo en unos minutos.';
}

async function llamarGroqUnaVez(model, messages, { temperature, max_tokens, seed }) {
  const cuerpo = {
    model,
    temperature,
    max_tokens,
    top_p: 0.95,
    response_format: { type: 'json_object' },
    messages,
  };
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    cuerpo.seed = Math.abs(Math.trunc(seed)) % 2_147_483_647;
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(cuerpo),
  });

  if (res.ok) {
    const datos = await res.json();
    return { ok: true, contenido: datos.choices?.[0]?.message?.content || '' };
  }

  const texto = await res.text().catch(() => '');
  return { ok: false, status: res.status, texto };
}

async function llamarGroq(messages, { temperature = 0.7, max_tokens = 2200, seed } = {}) {
  const modelos = resolverModelos();
  let ultimoError = null;
  let tokensPedidos = ajustarMaxTokens(messages, max_tokens);

  for (const model of modelos) {
    // Hasta 2 intentos por modelo: si la petición es demasiado grande, bajamos max_tokens.
    for (let intento = 0; intento < 2; intento++) {
      const resultado = await llamarGroqUnaVez(model, messages, {
        temperature,
        max_tokens: tokensPedidos,
        seed,
      });

      if (resultado.ok) {
        if (model !== modelos[0] || intento > 0) {
          console.warn(
            `Groq OK con model=${model} max_tokens=${tokensPedidos} (intento ${intento + 1})`,
          );
        }
        return resultado.contenido;
      }

      console.error('Groq error', resultado.status, model, String(resultado.texto).slice(0, 500));
      ultimoError = new Error(mensajeErrorGroq(resultado.status, resultado.texto));

      if (esPeticionDemasiadoGrande(resultado.status, resultado.texto) && intento === 0) {
        tokensPedidos = Math.max(600, Math.floor(tokensPedidos * 0.55));
        console.warn(`Groq: petición grande → reintento con max_tokens=${tokensPedidos}`);
        continue;
      }

      if (esErrorModeloInexistente(resultado.status, resultado.texto)) {
        break; // siguiente modelo
      }

      throw ultimoError;
    }
  }

  throw ultimoError || new Error('El servicio de IA no respondió');
}

function barajar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

const ESTILOS_COCINA = [
  'prioriza platos rápidos de diario (menos de 30 min)',
  'prioriza cocción al horno o al microondas',
  'prioriza salteados y wok',
  'prioriza sopas, cremas o guisos',
  'prioriza ensaladas completas o bowls',
  'prioriza pasta o arroces',
  'prioriza cocción mediterránea española',
  'prioriza platos con huevo o proteicos',
  'prioriza opciones vegetarianas si la despensa lo permite',
  'prioriza aprovechameientos y cero desperdicio',
  'prioriza desayunos o cenas ligeras',
  'prioriza platos de cuchara reconfortantes',
];

function elegirEstilo(tipoComida) {
  const porTipo = {
    desayuno: [
      'prioriza tostadas, bowls o platos rápidos de mañana',
      'prioriza huevos o lácteos si hay en la despensa',
      'prioriza opciones dulces o saladas ligeras de desayuno',
      'prioriza batidos, porridge o elaboraciones de 10–15 min',
    ],
    almuerzo: [
      'prioriza platos de cuchara o guisos para mediodía',
      'prioriza platos completos con proteína y guarnición',
      'prioriza cocción al horno o al microondas',
      'prioriza pasta, arroces o legumbres',
      'prioriza salteados y wok',
    ],
    cena: [
      'prioriza cenas ligeras y digestivas',
      'prioriza ensaladas completas o bowls',
      'prioriza platos rápidos de menos de 25 min',
      'prioriza pescado, huevo o verduras si hay en la despensa',
      'prioriza sopas o cremas suaves',
    ],
  };
  const lista = porTipo[tipoComida] || ESTILOS_COCINA;
  return lista[Math.floor(Math.random() * lista.length)];
}

function etiquetaTipoComida(tipo) {
  if (tipo === 'desayuno') return 'DESAYUNO';
  if (tipo === 'cena') return 'CENA';
  return 'ALMUERZO / COMIDA';
}

function guiaTipoComida(tipo) {
  if (tipo === 'desayuno') {
    return 'Adapta las 3 recetas a DESAYUNO: porciones matutinas, técnicas rápidas, evita guisos pesados de comida/cena.';
  }
  if (tipo === 'cena') {
    return 'Adapta las 3 recetas a CENA: más ligeras y digestivas que un almuerzo; evita frituras muy pesadas si hay alternativa.';
  }
  return 'Adapta las 3 recetas a ALMUERZO (comida del mediodía): platos más completos y saciantes.';
}

function construirPrompt({
  despensa,
  alergenos,
  preferencias,
  evitados,
  evitarTitulos,
  recientes,
  tipoComida,
}) {
  const despensaBarajada = barajar(despensa || []).slice(0, 40);
  const lineasDespensa = despensaBarajada
    .map((d) => `- ${d.nombre}: ${d.cantidad} ${d.unidad}`)
    .join('\n');

  const restricciones = [
    alergenos?.length ? `Alérgenos a evitar SIEMPRE: ${alergenos.join(', ')}.` : '',
    evitados?.length ? `Alimentos que la familia evita: ${evitados.join(', ')}.` : '',
    preferencias?.length ? `Preferencias: ${preferencias.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const comida = ['desayuno', 'almuerzo', 'cena'].includes(tipoComida) ? tipoComida : 'almuerzo';
  const estilo = elegirEstilo(comida);
  const titulosEvitar = (evitarTitulos || [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 24);
  const ingredientesRecientes = (recientes || [])
    .map((n) => String(n).trim())
    .filter(Boolean)
    .slice(0, 12);

  return `Eres el chef de una app familiar española de cocina llamada Cocinita.

TIPO DE COMIDA: ${etiquetaTipoComida(comida)}.
${guiaTipoComida(comida)}

DESPENSA DISPONIBLE (usa ingredientes distintos en cada receta; no ignores lo nuevo):
${lineasDespensa || '- (despensa vacía)'}

${restricciones ? `RESTRICCIONES DEL HOGAR:\n${restricciones}\n` : ''}
${ingredientesRecientes.length ? `INGREDIENTES RECIÉN AÑADIDOS (al menos una receta debe usar varios de estos): ${ingredientesRecientes.join(', ')}.\n` : ''}
ENFOQUE DE ESTA RONDA: ${estilo}.
${titulosEvitar.length ? `NO REPITAS estas recetas ni variantes casi iguales (cambia el plato principal): ${titulosEvitar.join(' · ')}.\n` : ''}
Propón exactamente 3 recetas caseras y realistas, BIEN DISTINTAS entre sí (técnicas y protagonistas diferentes), adecuadas para ${etiquetaTipoComida(comida).toLowerCase()}, que se puedan hacer usando PRINCIPALMENTE los ingredientes de la despensa. Puedes asumir básicos (agua, sal, aceite, pimienta). Si falta algún ingrediente secundario, inclúyelo igualmente marcándolo con "enDespensa": false.

Varía títulos y platos: no propongas siempre tortilla, pasta genérica o arroz blanco si hay otras opciones con lo disponible.
Incluye la etiqueta "${comida}" en etiquetas de cada receta.

Responde SOLO con JSON válido, sin markdown:
{
  "recetas": [
    {
      "titulo": "string",
      "descripcion": "string (1-2 frases)",
      "raciones": 2,
      "tiempoMin": 30,
      "dificultad": "facil|media|dificil",
      "etiquetas": ["casero", "${comida}"],
      "ingredientes": [
        { "nombre": "string", "cantidad": 200, "unidad": "g|kg|ml|l|ud|cda|cdta", "enDespensa": true }
      ],
      "pasos": [
        { "titulo": "string", "descripcion": "string" }
      ]
    }
  ]
}

Todo en español. Máximo 8 ingredientes y 6 pasos por receta.`;
}

function extraerJson(texto) {
  // El modelo a veces envuelve el JSON en ```json ... ``` o añade texto.
  const limpio = texto.replace(/```json|```/g, '').trim();
  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (inicio === -1 || fin === -1) throw new Error('La IA no devolvió JSON');
  return JSON.parse(limpio.slice(inicio, fin + 1));
}

const DIFICULTADES = new Set(['facil', 'media', 'dificil']);
const UNIDADES = new Set(['g', 'kg', 'ml', 'l', 'ud', 'cda', 'cdta']);

function normalizarReceta(r) {
  if (!r || typeof r !== 'object' || !r.titulo) return null;
  return {
    titulo: String(r.titulo).slice(0, 120),
    descripcion: String(r.descripcion || '').slice(0, 400),
    raciones: Number(r.raciones) > 0 ? Math.round(Number(r.raciones)) : 2,
    tiempoMin: Number(r.tiempoMin) > 0 ? Math.round(Number(r.tiempoMin)) : 30,
    dificultad: DIFICULTADES.has(r.dificultad) ? r.dificultad : 'facil',
    etiquetas: Array.isArray(r.etiquetas) ? r.etiquetas.slice(0, 6).map(String) : [],
    ingredientes: (Array.isArray(r.ingredientes) ? r.ingredientes : [])
      .filter((i) => i && i.nombre)
      .map((i) => ({
        nombre: String(i.nombre).slice(0, 80),
        cantidad: Number(i.cantidad) > 0 ? Number(i.cantidad) : 1,
        unidad: UNIDADES.has(i.unidad) ? i.unidad : 'ud',
        enDespensa: Boolean(i.enDespensa),
      })),
    pasos: (Array.isArray(r.pasos) ? r.pasos : [])
      .filter((p) => p && (p.descripcion || p.titulo))
      .map((p) => ({
        titulo: String(p.titulo || 'Paso').slice(0, 80),
        descripcion: String(p.descripcion || '').slice(0, 600),
      })),
  };
}

/** Llama a Groq y devuelve { recetas: [...] } ya validado. */
export async function generarRecetasIA(payload) {
  const seed = Date.now() ^ Math.floor(Math.random() * 1_000_000);
  const texto = await llamarGroq(
    [
      {
        role: 'system',
        content:
          'Eres un chef español creativo. Respondes solo JSON válido. Cada ronda propones platos distintos y aprovechas ingredientes recién añadidos.',
      },
      { role: 'user', content: construirPrompt(payload) },
    ],
    { temperature: 0.95, seed, max_tokens: 2200 },
  );

  const json = extraerJson(texto);

  const recetas = (Array.isArray(json.recetas) ? json.recetas : [])
    .map(normalizarReceta)
    .filter(Boolean)
    .slice(0, 4);

  if (recetas.length === 0) throw new Error('La IA no propuso recetas válidas');
  return { recetas };
}

function construirContextoDespensa(despensa) {
  const lineas = (despensa || [])
    .slice(0, 40)
    .map((d) => `- ${d.nombre}: ${d.cantidad} ${d.unidad}`)
    .join('\n');
  return lineas || '- (despensa vacía)';
}

function construirRestricciones({ alergenos, preferencias, evitados }) {
  return [
    alergenos?.length ? `Alérgenos a evitar SIEMPRE: ${alergenos.join(', ')}.` : '',
    evitados?.length ? `Alimentos que la familia evita: ${evitados.join(', ')}.` : '',
    preferencias?.length ? `Preferencias: ${preferencias.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function construirPromptChat({ despensa, alergenos, preferencias, evitados, mensaje, tipoComida }) {
  const restricciones = construirRestricciones({ alergenos, preferencias, evitados });
  const comida = ['desayuno', 'almuerzo', 'cena'].includes(tipoComida) ? tipoComida : 'almuerzo';

  return `Eres el chef de Cocinita, una app familiar española de cocina.

TIPO DE COMIDA OBJETIVO: ${etiquetaTipoComida(comida)}.
${guiaTipoComida(comida).replace('las 3 recetas', 'la receta')}

DESPENSA ACTUAL (compara cada ingrediente de la receta con esta lista; marca enDespensa=true solo si hay cantidad suficiente):
${construirContextoDespensa(despensa)}

${restricciones ? `RESTRICCIONES DEL HOGAR:\n${restricciones}\n` : ''}
Puedes asumir básicos (agua, sal, aceite, pimienta) como enDespensa=true.

Petición del usuario: "${mensaje}"

Responde en español. Sé creativo y no propongas siempre el mismo plato típico: varía técnica y protagonista según la despensa.
Si hay ingredientes poco habituales o recién añadidos, úsalos cuando encajen.
Si el usuario pide una receta concreta o pregunta qué le falta, incluye la receta completa adaptada a ${etiquetaTipoComida(comida).toLowerCase()}.
Si solo conversa o pregunta algo general, receta puede ser null.

Responde SOLO con JSON válido, sin markdown:
{
  "mensaje": "respuesta conversacional breve (2-4 frases)",
  "receta": null | {
    "titulo": "string",
    "descripcion": "string",
    "raciones": 2,
    "tiempoMin": 30,
    "dificultad": "facil|media|dificil",
    "etiquetas": ["casero", "${comida}"],
    "ingredientes": [
      { "nombre": "string", "cantidad": 200, "unidad": "g|kg|ml|l|ud|cda|cdta", "enDespensa": true }
    ],
    "pasos": [{ "titulo": "string", "descripcion": "string" }]
  }
}

Para cada ingrediente de la receta, compara con la despensa: enDespensa=true si hay stock suficiente; false si falta o no hay.`;
}

/** Extrae ingredientes que hay que comprar a partir de una receta normalizada. */
export function extraerFaltantes(receta) {
  if (!receta?.ingredientes) return [];
  return receta.ingredientes
    .filter((i) => !i.enDespensa)
    .map((i) => ({
      nombre: i.nombre,
      cantidad: i.cantidad,
      unidad: i.unidad,
    }));
}

/**
 * Chat con el chef: recetas a petición y comparación con la despensa.
 * historial: [{ role: 'user'|'assistant', content: string }]
 */
export async function chatChefIA(payload) {
  const { mensaje, historial = [], despensa, alergenos, preferencias, evitados } = payload;

  const mensajesGroq = [
    {
      role: 'system',
      content:
        'Eres un chef español amable en Cocinita. Respondes solo JSON válido. Comparas siempre con la despensa del usuario.',
    },
  ];

  for (const h of historial.slice(-8)) {
    if (h.role === 'user' || h.role === 'assistant') {
      mensajesGroq.push({ role: h.role, content: String(h.content).slice(0, 800) });
    }
  }

  mensajesGroq.push({
    role: 'user',
    content: construirPromptChat({
      despensa,
      alergenos,
      preferencias,
      evitados,
      mensaje,
      tipoComida: payload.tipoComida,
    }),
  });

  const texto = await llamarGroq(mensajesGroq, { temperature: 0.75, max_tokens: 2000 });
  const json = extraerJson(texto);

  const mensajeRespuesta = String(json.mensaje || 'Aquí tienes.').slice(0, 1200);
  const receta = json.receta ? normalizarReceta(json.receta) : null;
  const faltantes = receta ? extraerFaltantes(receta) : [];

  return { mensaje: mensajeRespuesta, receta, faltantes };
}

/**
 * Estima las kcal por ración de una receta a partir de sus ingredientes.
 * Devuelve { caloriasPorRacion } ya validado.
 */
export async function estimarCaloriasReceta({ titulo, raciones, ingredientes }) {
  const lineas = (ingredientes || [])
    .filter((i) => i && i.nombre)
    .slice(0, 40)
    .map((i) => `- ${i.nombre}: ${i.cantidad} ${i.unidad}`)
    .join('\n');

  if (!lineas) throw new Error('La receta no tiene ingredientes para estimar');

  const rac = Number(raciones) > 0 ? Math.round(Number(raciones)) : 2;

  const prompt = `Eres un nutricionista. Estima las calorías de esta receta casera española.

RECETA: ${String(titulo || 'Sin título').slice(0, 120)}
RACIONES BASE: ${rac}

INGREDIENTES (cantidades para las ${rac} raciones):
${lineas}

Calcula las kcal TOTALES de toda la receta y divide entre las raciones.
Usa valores nutricionales estándar (USDA / BEDCA). Ignora agua, sal y especias sin aporte calórico relevante.

Responde SOLO con JSON válido, sin markdown:
{ "caloriasPorRacion": 450, "caloriasTotales": 900, "nota": "estimación breve" }

caloriasPorRacion debe ser un entero entre 30 y 2500.`;

  const texto = await llamarGroq(
    [
      {
        role: 'system',
        content: 'Eres un nutricionista preciso. Respondes solo JSON válido con enteros.',
      },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.2, max_tokens: 400 },
  );

  const json = extraerJson(texto);
  let porRacion = Math.round(Number(json.caloriasPorRacion));

  // Si el modelo solo devolvió el total, lo derivamos.
  if (!Number.isFinite(porRacion) || porRacion <= 0) {
    const totales = Math.round(Number(json.caloriasTotales));
    if (Number.isFinite(totales) && totales > 0) porRacion = Math.round(totales / rac);
  }

  if (!Number.isFinite(porRacion) || porRacion < 30 || porRacion > 2500) {
    throw new Error('La IA no pudo estimar las calorías de esta receta');
  }

  return {
    caloriasPorRacion: porRacion,
    nota: String(json.nota || '').slice(0, 200) || undefined,
  };
}
