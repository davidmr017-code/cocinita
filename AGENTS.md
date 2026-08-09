# Cocinita — guía para agentes

App familiar de cocina: React + Vite (frontend), Express + Postgres (API en `server/`).

## Comandos útiles

- `npm run dev:local` — frontend
- `npm run dev:api` — API local
- `npm run dev:full` — frontend + API
- `npm run build` — compilar frontend (tsc + vite)
- `npm run lint` — oxlint

## Cursor Cloud specific instructions

- El frontend está en la raíz; la API en `server/`.
- Para probar la API en la nube hacen falta secretos en [Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents): `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, opcional `GROQ_API_KEY` (Chef IA).
- Sin base de datos, el frontend funciona en modo local (localStorage); el modo familia requiere Postgres (Railway).
- Despliegue: frontend en Vercel, API en Railway. Repo: `github.com/davidmr017-code/cocinita`.
