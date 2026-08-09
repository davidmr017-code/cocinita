/**
 * Recetas con IA (Groq, API compatible con OpenAI).
 * Recibe la despensa y el perfil del hogar y devuelve recetas en JSON.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELO = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export function iaDisponible() {
  return Boolean(process.env.GROQ_API_KEY);
}

function construirPrompt({ despensa, alergenos, preferencias, evitados }) {
  const lineasDespensa = despensa
    .map((d) => `- ${d.nombre}: ${d.cantidad} ${d.unidad}`)
    .join('\n');

  const restricciones = [
    alergenos?.length ? `Alérgenos a evitar SIEMPRE: ${alergenos.join(', ')}.` : '',
    evitados?.length ? `Alimentos que la familia evita: ${evitados.join(', ')}.` : '',
    preferencias?.length ? `Preferencias: ${preferencias.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `Eres el chef de una app familiar española de cocina llamada Cocinita.

DESPENSA DISPONIBLE:
${lineasDespensa || '- (despensa vacía)'}

${restricciones ? `RESTRICCIONES DEL HOGAR:\n${restricciones}\n` : ''}
Propón exactamente 3 recetas caseras y realistas que se puedan hacer usando PRINCIPALMENTE los ingredientes de la despensa. Puedes asumir básicos (agua, sal, aceite, pimienta). Si falta algún ingrediente secundario, inclúyelo igualmente marcándolo con "enDespensa": false.

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
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODELO,
      temperature: 0.8,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Eres un chef español. Respondes solo JSON válido.' },
        { role: 'user', content: construirPrompt(payload) },
      ],
    }),
  });

  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '');
    console.error('Groq error', res.status, cuerpo.slice(0, 500));
    if (res.status === 401) throw new Error('Clave de Groq inválida');
    if (res.status === 429) throw new Error('La IA está saturada, prueba en un minuto');
    throw new Error('El servicio de IA no respondió');
  }

  const datos = await res.json();
  const texto = datos.choices?.[0]?.message?.content || '';
  const json = extraerJson(texto);

  const recetas = (Array.isArray(json.recetas) ? json.recetas : [])
    .map(normalizarReceta)
    .filter(Boolean)
    .slice(0, 4);

  if (recetas.length === 0) throw new Error('La IA no propuso recetas válidas');
  return { recetas };
}
