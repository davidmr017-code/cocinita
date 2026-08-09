import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = () => process.env.JWT_SECRET || 'cocinita-dev-secret-cambia-esto';

export function firmarToken(payload) {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: '60d' });
}

export function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET());
}

export async function hashPin(pin) {
  if (!pin) return null;
  return bcrypt.hash(String(pin), 10);
}

export async function comprobarPin(pin, hash) {
  if (!hash) return true; // hogar sin PIN
  if (!pin) return false;
  return bcrypt.compare(String(pin), hash);
}

/** Código corto legible para unirse al hogar (ej. COCI-7K2M). */
export function generarCodigoHogar() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let cuerpo = '';
  for (let i = 0; i < 4; i++) {
    cuerpo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return `COCI-${cuerpo}`;
}

export function middlewareAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Necesitas iniciar sesión en el hogar' });
  }
  try {
    req.usuario = verificarToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión caducada. Vuelve a entrar al hogar.' });
  }
}
