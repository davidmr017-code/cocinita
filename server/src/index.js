import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool, inicializarDb } from './db.js';
import {
  comprobarPin,
  firmarToken,
  generarCodigoHogar,
  hashPin,
  middlewareAuth,
} from './auth.js';
import {
  clonarEstado,
  esEstadoValido,
  incorporarUsuarioAlPerfil,
  perfilMiembroNuevo,
} from './estado.js';
import { generarRecetasIA, chatChefIA, estimarCaloriasReceta, iaDisponible } from './ia.js';

const app = express();
const PORT = Number(process.env.PORT) || 3080;

const origenes = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origenes.includes('*')
      ? true
      : (origin, cb) => {
          if (!origin || origenes.includes(origin)) cb(null, true);
          else cb(new Error('Origen no permitido por CORS'));
        },
    credentials: true,
  }),
);
app.use(express.json({ limit: '8mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, servicio: 'cocinita-api' });
});

/** Crear un hogar nuevo y entrar como primer miembro. */
app.post('/api/auth/crear', async (req, res) => {
  try {
    const nombreHogar = String(req.body?.nombreHogar || '').trim();
    const nombreUsuario = String(req.body?.nombreUsuario || '').trim();
    const pin = req.body?.pin ? String(req.body.pin).trim() : '';
    const conDatosEjemplo = Boolean(req.body?.conDatosEjemplo);
    const datosIniciales = req.body?.estado;

    if (!nombreHogar || !nombreUsuario) {
      return res.status(400).json({ error: 'Indica el nombre del hogar y el tuyo' });
    }
    if (pin && (pin.length < 4 || pin.length > 8)) {
      return res.status(400).json({ error: 'El PIN debe tener entre 4 y 8 caracteres' });
    }

    let codigo = generarCodigoHogar();
    const pinHash = await hashPin(pin || null);

    // Reintentar si hay colisión de código (muy raro)
    let hogar;
    for (let i = 0; i < 5; i++) {
      try {
        const r = await pool.query(
          `INSERT INTO hogares (nombre, codigo, pin_hash)
           VALUES ($1, $2, $3)
           RETURNING id, nombre, codigo, creado_en`,
          [nombreHogar, codigo, pinHash],
        );
        hogar = r.rows[0];
        break;
      } catch (err) {
        if (err.code === '23505') {
          codigo = generarCodigoHogar();
          continue;
        }
        throw err;
      }
    }
    if (!hogar) return res.status(500).json({ error: 'No se pudo crear el hogar' });

    const usuarioR = await pool.query(
      `INSERT INTO usuarios (hogar_id, nombre)
       VALUES ($1, $2)
       RETURNING id, nombre, hogar_id`,
      [hogar.id, nombreUsuario],
    );
    const usuario = usuarioR.rows[0];

    let estado = clonarEstado();
    estado.perfil = {
      ...estado.perfil,
      nombreHogar,
      miembros: [
        {
          id: usuario.id,
          nombre: nombreUsuario,
          color: '#3f5c3e',
          alergenos: [],
          preferencias: ['casero', 'rapido'],
          evitados: [],
          notas: '',
        },
      ],
    };

    if (conDatosEjemplo && esEstadoValido(datosIniciales)) {
      estado = clonarEstado(datosIniciales);
      // Recetas/despensa de ejemplo, pero miembros = quien crea el hogar (no los del seed)
      estado.perfil = {
        ...estado.perfil,
        nombreHogar,
        miembros: [perfilMiembroNuevo(usuario, 0)],
      };
    }

    await pool.query(
      `INSERT INTO estados_hogar (hogar_id, version, datos, actualizado_por)
       VALUES ($1, 1, $2::jsonb, $3)`,
      [hogar.id, JSON.stringify(estado), usuario.id],
    );

    const token = firmarToken({
      sub: usuario.id,
      hogarId: hogar.id,
      nombre: usuario.nombre,
    });

    res.status(201).json({
      token,
      hogar: { id: hogar.id, nombre: hogar.nombre, codigo: hogar.codigo },
      usuario: { id: usuario.id, nombre: usuario.nombre },
      version: 1,
      estado,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el hogar' });
  }
});

/** Unirse a un hogar existente con el código familiar. */
app.post('/api/auth/unirse', async (req, res) => {
  try {
    const codigo = String(req.body?.codigo || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    const nombreUsuario = String(req.body?.nombreUsuario || '').trim();
    const pin = req.body?.pin ? String(req.body.pin).trim() : '';

    if (!codigo || !nombreUsuario) {
      return res.status(400).json({ error: 'Indica el código del hogar y tu nombre' });
    }

    const hogarR = await pool.query(
      `SELECT id, nombre, codigo, pin_hash FROM hogares WHERE codigo = $1`,
      [codigo],
    );
    const hogar = hogarR.rows[0];
    if (!hogar) return res.status(404).json({ error: 'No hay ningún hogar con ese código' });

    const pinOk = await comprobarPin(pin, hogar.pin_hash);
    if (!pinOk) return res.status(403).json({ error: 'PIN incorrecto' });

    let usuario;
    const existente = await pool.query(
      `SELECT id, nombre, hogar_id FROM usuarios WHERE hogar_id = $1 AND lower(nombre) = lower($2)`,
      [hogar.id, nombreUsuario],
    );
    if (existente.rows[0]) {
      usuario = existente.rows[0];
    } else {
      const creado = await pool.query(
        `INSERT INTO usuarios (hogar_id, nombre)
         VALUES ($1, $2)
         RETURNING id, nombre, hogar_id`,
        [hogar.id, nombreUsuario],
      );
      usuario = creado.rows[0];
    }

    const client = await pool.connect();
    let version;
    let estado;
    try {
      await client.query('BEGIN');
      const estadoR = await client.query(
        `SELECT version, datos FROM estados_hogar WHERE hogar_id = $1 FOR UPDATE`,
        [hogar.id],
      );
      const fila = estadoR.rows[0];
      if (!fila) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'El hogar no tiene datos' });
      }

      // Incorporar a todos los usuarios autenticados en el perfil visible
      const usuariosR = await client.query(
        `SELECT id, nombre FROM usuarios WHERE hogar_id = $1 ORDER BY creado_en`,
        [hogar.id],
      );
      estado = fila.datos;
      let changed = false;
      for (const u of usuariosR.rows) {
        const r = incorporarUsuarioAlPerfil(estado, u);
        estado = r.estado;
        changed = changed || r.changed;
      }

      if (changed) {
        version = fila.version + 1;
        await client.query(
          `UPDATE estados_hogar
           SET version = $1, datos = $2::jsonb, actualizado_en = NOW(), actualizado_por = $3
           WHERE hogar_id = $4`,
          [version, JSON.stringify(estado), usuario.id, hogar.id],
        );
      } else {
        version = fila.version;
      }
      await client.query('COMMIT');
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw err;
    } finally {
      client.release();
    }

    const token = firmarToken({
      sub: usuario.id,
      hogarId: hogar.id,
      nombre: usuario.nombre,
    });

    res.json({
      token,
      hogar: { id: hogar.id, nombre: hogar.nombre, codigo: hogar.codigo },
      usuario: { id: usuario.id, nombre: usuario.nombre },
      version,
      estado,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al unirse al hogar' });
  }
});

app.get('/api/auth/yo', middlewareAuth, async (req, res) => {
  try {
    const { sub, hogarId } = req.usuario;
    const r = await pool.query(
      `SELECT u.id, u.nombre, h.id AS hogar_id, h.nombre AS hogar_nombre, h.codigo
       FROM usuarios u
       JOIN hogares h ON h.id = u.hogar_id
       WHERE u.id = $1 AND h.id = $2`,
      [sub, hogarId],
    );
    const row = r.rows[0];
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({
      usuario: { id: row.id, nombre: row.nombre },
      hogar: { id: row.hogar_id, nombre: row.hogar_nombre, codigo: row.codigo },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar la sesión' });
  }
});

app.get('/api/state', middlewareAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `SELECT version, datos, actualizado_en FROM estados_hogar WHERE hogar_id = $1 FOR UPDATE`,
      [req.usuario.hogarId],
    );
    const fila = r.rows[0];
    if (!fila) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Estado no encontrado' });
    }

    const usuariosR = await client.query(
      `SELECT id, nombre FROM usuarios WHERE hogar_id = $1 ORDER BY creado_en`,
      [req.usuario.hogarId],
    );
    let estado = fila.datos;
    let version = fila.version;
    let actualizadoEn = fila.actualizado_en;
    let changed = false;
    for (const u of usuariosR.rows) {
      const out = incorporarUsuarioAlPerfil(estado, u);
      estado = out.estado;
      changed = changed || out.changed;
    }

    if (changed) {
      version = fila.version + 1;
      const upd = await client.query(
        `UPDATE estados_hogar
         SET version = $1, datos = $2::jsonb, actualizado_en = NOW(), actualizado_por = $3
         WHERE hogar_id = $4
         RETURNING actualizado_en`,
        [version, JSON.stringify(estado), req.usuario.sub, req.usuario.hogarId],
      );
      actualizadoEn = upd.rows[0].actualizado_en;
    }

    await client.query('COMMIT');
    res.json({ version, estado, actualizadoEn });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    console.error(err);
    res.status(500).json({ error: 'Error al leer el estado' });
  } finally {
    client.release();
  }
});

/**
 * Guarda el estado del hogar.
 * Body: { version, estado } — si version no coincide → 409 con el estado actual.
 */
app.put('/api/state', middlewareAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const versionCliente = Number(req.body?.version);
    const estado = req.body?.estado;
    if (!Number.isFinite(versionCliente) || !esEstadoValido(estado)) {
      return res.status(400).json({ error: 'Payload de estado inválido' });
    }

    await client.query('BEGIN');
    const actual = await client.query(
      `SELECT version FROM estados_hogar WHERE hogar_id = $1 FOR UPDATE`,
      [req.usuario.hogarId],
    );
    const fila = actual.rows[0];
    if (!fila) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Estado no encontrado' });
    }

    if (fila.version !== versionCliente) {
      const fresco = await client.query(
        `SELECT version, datos, actualizado_en FROM estados_hogar WHERE hogar_id = $1`,
        [req.usuario.hogarId],
      );
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Otro familiar ha guardado cambios. Se ha recargado su versión.',
        version: fresco.rows[0].version,
        estado: fresco.rows[0].datos,
        actualizadoEn: fresco.rows[0].actualizado_en,
      });
    }

    const nuevaVersion = fila.version + 1;
    const upd = await client.query(
      `UPDATE estados_hogar
       SET version = $1,
           datos = $2::jsonb,
           actualizado_en = NOW(),
           actualizado_por = $3
       WHERE hogar_id = $4
       RETURNING version, actualizado_en`,
      [nuevaVersion, JSON.stringify(estado), req.usuario.sub, req.usuario.hogarId],
    );
    await client.query('COMMIT');

    res.json({
      version: upd.rows[0].version,
      actualizadoEn: upd.rows[0].actualizado_en,
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el estado' });
  } finally {
    client.release();
  }
});

/**
 * Chef IA: propone recetas con los ingredientes de la despensa.
 * Body: { despensa: [{nombre, cantidad, unidad}], alergenos, preferencias, evitados }
 */
app.post('/api/ia/recetas', middlewareAuth, async (req, res) => {
  try {
    if (!iaDisponible()) {
      return res.status(503).json({
        error: 'La IA no está configurada (falta GROQ_API_KEY en el servidor)',
      });
    }

    const despensa = Array.isArray(req.body?.despensa) ? req.body.despensa.slice(0, 120) : [];
    if (despensa.length === 0) {
      return res.status(400).json({ error: 'Tu despensa está vacía: añade ingredientes primero' });
    }

    const resultado = await generarRecetasIA({
      despensa: despensa.map((d) => ({
        nombre: String(d?.nombre || '').slice(0, 80),
        cantidad: Number(d?.cantidad) || 0,
        unidad: String(d?.unidad || 'ud').slice(0, 6),
      })),
      alergenos: Array.isArray(req.body?.alergenos) ? req.body.alergenos.slice(0, 20).map(String) : [],
      preferencias: Array.isArray(req.body?.preferencias) ? req.body.preferencias.slice(0, 20).map(String) : [],
      evitados: Array.isArray(req.body?.evitados) ? req.body.evitados.slice(0, 30).map(String) : [],
    });

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message || 'No se pudieron generar recetas' });
  }
});

/**
 * Chat con el Chef IA: recetas a petición y faltantes vs despensa.
 * Body: { mensaje, historial?, despensa, alergenos?, preferencias?, evitados? }
 */
app.post('/api/ia/chat', middlewareAuth, async (req, res) => {
  try {
    if (!iaDisponible()) {
      return res.status(503).json({
        error: 'La IA no está configurada (falta GROQ_API_KEY en el servidor)',
      });
    }

    const mensaje = String(req.body?.mensaje || '').trim().slice(0, 500);
    if (!mensaje) {
      return res.status(400).json({ error: 'Escribe qué receta quieres o qué te apetece cocinar' });
    }

    const despensa = Array.isArray(req.body?.despensa) ? req.body.despensa.slice(0, 120) : [];
    const historial = Array.isArray(req.body?.historial)
      ? req.body.historial.slice(-10).filter((h) => h?.role && h?.content)
      : [];

    const resultado = await chatChefIA({
      mensaje,
      historial,
      despensa: despensa.map((d) => ({
        nombre: String(d?.nombre || '').slice(0, 80),
        cantidad: Number(d?.cantidad) || 0,
        unidad: String(d?.unidad || 'ud').slice(0, 6),
      })),
      alergenos: Array.isArray(req.body?.alergenos) ? req.body.alergenos.slice(0, 20).map(String) : [],
      preferencias: Array.isArray(req.body?.preferencias) ? req.body.preferencias.slice(0, 20).map(String) : [],
      evitados: Array.isArray(req.body?.evitados) ? req.body.evitados.slice(0, 30).map(String) : [],
    });

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message || 'No se pudo responder' });
  }
});

/**
 * Estima calorías de una receta a partir de sus ingredientes.
 * Body: { titulo, raciones, ingredientes: [{nombre, cantidad, unidad}] }
 */
app.post('/api/ia/calorias', middlewareAuth, async (req, res) => {
  try {
    if (!iaDisponible()) {
      return res.status(503).json({
        error: 'La IA no está configurada (falta GROQ_API_KEY en el servidor)',
      });
    }

    const ingredientes = Array.isArray(req.body?.ingredientes)
      ? req.body.ingredientes.slice(0, 40)
      : [];
    if (ingredientes.length === 0) {
      return res.status(400).json({ error: 'La receta no tiene ingredientes' });
    }

    const resultado = await estimarCaloriasReceta({
      titulo: String(req.body?.titulo || '').slice(0, 120),
      raciones: Number(req.body?.raciones) || 2,
      ingredientes: ingredientes.map((i) => ({
        nombre: String(i?.nombre || '').slice(0, 80),
        cantidad: Number(i?.cantidad) || 0,
        unidad: String(i?.unidad || 'ud').slice(0, 6),
      })),
    });

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err.message || 'No se pudieron estimar las calorías' });
  }
});

app.get('/api/hogar/miembros', middlewareAuth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, nombre, creado_en FROM usuarios WHERE hogar_id = $1 ORDER BY creado_en`,
      [req.usuario.hogarId],
    );
    res.json({ miembros: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar miembros' });
  }
});

async function arrancar() {
  await inicializarDb();
  app.listen(PORT, () => {
    console.log(`Cocinita API en :${PORT}`);
  });
}

arrancar().catch((err) => {
  console.error('No se pudo arrancar la API', err);
  process.exit(1);
});
