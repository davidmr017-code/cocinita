/**
 * Comprueba resolución de modelos, TPM y mensajes de error (sin llamar a Groq).
 * Uso: node scripts/probar-modelo-groq.mjs
 */
import {
  ajustarMaxTokens,
  esCuotaDiaria,
  esPeticionDemasiadoGrande,
  estimarTokensMensajes,
  mensajeErrorGroq,
  resolverModelos,
} from '../src/ia.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const porDefecto = resolverModelos('');
assert(porDefecto[0] === 'openai/gpt-oss-120b', `defecto inesperado: ${porDefecto[0]}`);

const remapeado = resolverModelos('llama-3.3-70b-versatile');
assert(remapeado[0] === 'openai/gpt-oss-120b', `remap falló: ${remapeado[0]}`);

const cuerpoGrande =
  '{"error":{"message":"Request too large for model `openai/gpt-oss-120b` in organization org_x service tier `on_demand` on tokens per minute (TPM): Limit 8000, Requested 9200, please reduce your message size and try again.","type":"tokens","code":"rate_limit_exceeded"}}';

assert(esPeticionDemasiadoGrande(413, cuerpoGrande), 'debe detectar petición grande 413');
assert(esPeticionDemasiadoGrande(429, cuerpoGrande), 'debe detectar petición grande 429');
assert(!esCuotaDiaria(429, cuerpoGrande), 'TPM no es cuota diaria');

const msgGrande = mensajeErrorGroq(413, cuerpoGrande);
assert(msgGrande.toLowerCase().includes('grande'), `msg grande: ${msgGrande}`);
assert(!msgGrande.toLowerCase().includes('cuota'), `no debe decir cuota: ${msgGrande}`);

const cuerpoDia =
  '{"error":{"message":"Rate limit reached for model. Limit 100000 tokens per day (TPD)","type":"tokens","code":"rate_limit_exceeded"}}';
assert(esCuotaDiaria(429, cuerpoDia), 'debe detectar TPD');
assert(mensajeErrorGroq(429, cuerpoDia).toLowerCase().includes('cuota'), 'msg TPD');

const msgs = [{ role: 'user', content: 'hola '.repeat(500) }];
const est = estimarTokensMensajes(msgs);
const capped = ajustarMaxTokens(msgs, 4000);
assert(capped < 4000, `debe recortar max_tokens: ${capped}`);
assert(est + capped <= 7500 + 50, `suma fuera de techo: est=${est} max=${capped}`);

console.log('OK TPM + mensajes Groq');
console.log(
  JSON.stringify(
    { porDefecto, remapeado, msgGrande, capped, est, msgCuota: mensajeErrorGroq(429, cuerpoDia) },
    null,
    2,
  ),
);
