/**
 * Comprueba resolución de modelos y mensajes de error (sin llamar a Groq).
 * Uso: node scripts/probar-modelo-groq.mjs
 */
import { mensajeErrorGroq, resolverModelos } from '../src/ia.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const porDefecto = resolverModelos('');
assert(porDefecto[0] === 'openai/gpt-oss-120b', `defecto inesperado: ${porDefecto[0]}`);
assert(porDefecto.includes('qwen/qwen3.6-27b'), 'falta respaldo qwen');

const remapeado = resolverModelos('llama-3.3-70b-versatile');
assert(remapeado[0] === 'openai/gpt-oss-120b', `remap falló: ${remapeado[0]}`);

const custom = resolverModelos('openai/gpt-oss-20b');
assert(custom[0] === 'openai/gpt-oss-20b', `custom falló: ${custom[0]}`);

const msgModelo = mensajeErrorGroq(
  404,
  'The model llama-3.3-70b-versatile does not exist or you do not have access to it.',
);
assert(msgModelo.toLowerCase().includes('modelo'), `msg modelo: ${msgModelo}`);

const msgCuota = mensajeErrorGroq(429, '{"error":{"message":"Rate limit reached for model. Limit 100000 TPD"}}');
assert(msgCuota.toLowerCase().includes('cuota'), `msg cuota: ${msgCuota}`);

const msgRpm = mensajeErrorGroq(429, 'Rate limit reached. Please try again later.');
assert(msgRpm.toLowerCase().includes('saturada'), `msg rpm: ${msgRpm}`);

console.log('OK resolverModelos + mensajeErrorGroq');
console.log(JSON.stringify({ porDefecto, remapeado, custom, msgModelo, msgCuota, msgRpm }, null, 2));
