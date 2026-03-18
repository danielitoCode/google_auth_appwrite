# Cloudflare Worker: Google Auth (GSI → Appwrite) (sin sleep)

Este Worker implementa el flujo:

1) Frontend obtiene `credential` (Google ID token) via Google Sign-In (GSI)
2) Frontend manda `{ credential }` a este Worker
3) Worker verifica el ID token (JWKS, issuer/audience/exp)
4) Worker busca/crea usuario en Appwrite por `email` y valida vínculo con `prefs.sub`
5) Worker crea `Users.createToken(userId)` y responde `{ kind: "session", userId, secret }`

## Endpoint

- `POST /` (o cualquier ruta del Worker):

```json
{ "credential": "<google_id_token>", "allowCreate": true }
```

Respuestas:

- `kind=session`:

```json
{ "kind": "session", "userId": "...", "secret": "...", "email": "...", "sub": "..." }
```

- `kind=link_required` (usuario existe pero no está vinculado a ese `sub`):

```json
{ "kind": "link_required", "userId": "...", "email": "...", "sub": "..." }
```

- `kind=register_required` (no existe y `allowCreate=false`):

```json
{ "kind": "register_required", "email": "...", "sub": "..." }
```

Errores (HTTP 400/405):

```json
{ "error": "..." }
```

Healthcheck:

- `GET /` → `{ "ok": true }`

## Variables (Cloudflare)

Variables (no-secret):

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `GOOGLE_CLIENT_ID`
- `CORS_ORIGIN` (opcional)
- `ALLOW_CREATE` (opcional, `1` para permitir auto-registro si no llega `allowCreate=true`)

Secret:

- `APPWRITE_API_KEY`

## Montaje en Cloudflare (paso a paso)

1) Login Wrangler:

```bash
npx wrangler login
```

2) Configura variables y secrets en Cloudflare Dashboard:

- Workers & Pages → tu Worker → Settings → Variables
  - agrega las Variables (no-secret) de arriba
  - agrega `APPWRITE_API_KEY` como **Secret**

(Alternativa CLI para el secret):

```bash
npx wrangler secret put APPWRITE_API_KEY
```

3) Deploy:

```bash
npm i
npx wrangler deploy
```

4) URL pública:

- Si usas `workers.dev`, Wrangler te imprime la URL al desplegar.
- Si usas dominio propio/route: Workers → Triggers → Routes.

## Dev local

- Copia `.dev.vars.example` a `.dev.vars` (NO lo commitees) y ajusta valores.

```bash
npx wrangler dev
```
