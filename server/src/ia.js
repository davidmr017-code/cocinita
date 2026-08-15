/**
 * Recetas con IA (Groq, API compatible con OpenAI).
 * Recibe la despensa y el perfil del hogar y devuelve recetas en JSON.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELO = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export function iaDisponible() {
  return Boolean(process.env.GROQ_API_KEY);
}

async function llamarGroq(messages, { temperature = 0.7, max_tokens = 4000, seed } = {}) {
  const cuerpo = {
    model: MODELO,
    temperature,
    max_tokens,
    top_p: 0.95,
    response_format: { type: 'json_object' },
    messages,
  };
  // Semilla distinta en cada petición → más variedad entre llamadas.
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

  if (!res.ok) {
    const texto = await res.text().catch(() => '');
    console.error('Groq error', res.status, texto.slice(0, 500));
    if (res.status === 401) throw new Error('Clave de Groq inválida');
    if (res.status === 429) throw new Error('La IA está saturada, prueba en un minuto');
    throw new Error('El servicio de IA no respondió');
  }

  const datos = await res.json();
  return datos.choices?.[0]?.message?.content || '';
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

function elegirEstilo() {
  return ESTILOS_COCINA[Math.floor(Math.random() * ESTILOS_COCINA.length)];
}

function construirPrompt({ despensa, alergenos, preferencias, evitados, evitarTitulos, recientes }) {
  const despensaBarajada = barajar(despensa || []);
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

  const estilo = elegirEstilo();
  const titulosEvitar = (evitarTitulos || [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 24);
  const ingredientesRecientes = (recientes || [])
    .map((n) => String(n).trim())
    .filter(Boolean)
    .slice(0, 12);

  return `Eres el chef de una app familiar española de cocina llamada Cocinita.

DESPENSA DISPONIBLE (usa ingredientes distintos en cada receta; no ignores lo nuevo):
${lineasDespensa || '- (despensa vacía)'}

${restricciones ? `RESTRICCIONES DEL HOGAR:\n${restricciones}\n` : ''}
${ingredientesRecientes.length ? `INGREDIENTES RECIÉN AÑADIDOS (al menos una receta debe usar varios de estos): ${ingredientesRecientes.join(', ')}.\n` : ''}
ENFOQUE DE ESTA RONDA: ${estilo}.
${titulosEvitar.length ? `NO REPITAS estas recetas ni variantes casi iguales (cambia el plato principal): ${titulosEvitar.join(' · ')}.\n` : ''}
Propón exactamente 3 recetas caseras y realistas, BIEN DISTINTAS entre sí (técnicas y protagonistas diferentes), que se puedan hacer usando PRINCIPALMENTE los ingredientes de la despensa. Puedes asumir básicos (agua, sal, aceite, pimienta). Si falta algún ingrediente secundario, inclúyelo igualmente marcándolo con "enDespensa": false.

Varía títulos y platos: no propongas siempre tortilla, pasta genérica o arroz blanco si hay otras opciones con lo disponible.

Responde SOLO con JSON válido, sin texto adicional ni markdown, con esta forma exacta:
{
  "recetas": [
    {
      "titulo": "string",
      "descripcion": "string (1-2 frases apetitosas)",
      "raciones": 2,
      "tiempoMin": 30,
      "dificultad": "facil|media|dificil",
      "etiquetas": ["casero"],
      "ingredientes": [
        { "nombre": "string", "cantidad": 200, "unidad": "g|kg|ml|l|ud|cda|cdta", "enDespensa": true }
      ],
      "pasos": [
        { "titulo": "string corto", "descripcion": "string detallado" }
      ]
    }
  ]
}

Todo en español. Cantidades para las raciones indicadas.`;
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
    { temperature: 0.95, seed },
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
  const lineas = despensa
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

function construirPromptChat({ despensa, alergenos, preferencias, evitados, mensaje }) {
  const restricciones = construirRestricciones({ alergenos, preferencias, evitados });

  return `Eres el chef de Cocinita, una app familiar española de cocina.

DESPENSA ACTUAL (compara cada ingrediente de la receta con esta lista; marca enDespensa=true solo si hay cantidad suficiente):
${construirContextoDespensa(despensa)}

${restricciones ? `RESTRICCIONES DEL HOGAR:\n${restricciones}\n` : ''}
Puedes asumir básicos (agua, sal, aceite, pimienta) como enDespensa=true.

Petición del usuario: "${mensaje}"

Responde en español. Sé creativo y no propongas siempre el mismo plato típico: varía técnica y protagonista según la despensa.
Si hay ingredientes poco habituales o recién añadidos, úsalos cuando encajen.
Si el usuario pide una receta concreta o pregunta qué le falta, incluye la receta completa.
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
    "etiquetas": ["casero"],
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
    content: construirPromptChat({ despensa, alergenos, preferencias, evitados, mensaje }),
  });

  const texto = await llamarGroq(mensajesGroq, { temperature: 0.75, max_tokens: 4500 });
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
