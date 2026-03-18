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

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY` (Secret)
- `GOOGLE_CLIENT_ID`
- `CORS_ORIGIN` (opcional)
- `ALLOW_CREATE` (opcional, `1` para permitir auto-registro si no llega `allowCreate=true`)

## Deploy

```bash
cd E:\Proyectos\Backend\NodeJS\Workers\google_auth
npm i
npx wrangler deploy
```

## Dev local

- Variables (sin commitear secretos): usa `.dev.vars` (Wrangler) o exporta env vars antes de `wrangler dev`.

```bash
npx wrangler dev
```
