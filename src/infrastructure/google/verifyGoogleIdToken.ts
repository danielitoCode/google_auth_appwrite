import { createRemoteJWKSet, jwtVerify } from "jose";

import type { GoogleProfile } from "../../domain/google";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleTokenVerifierDeps = {
    googleClientId: string;
};

export async function verifyGoogleIdToken(
    credential: string,
    deps: GoogleTokenVerifierDeps
): Promise<GoogleProfile> {
    if (!credential) throw new Error("Falta credential (Google ID token).");
    if (!deps.googleClientId) throw new Error("Falta configurar GOOGLE_CLIENT_ID.");

    const { payload } = await jwtVerify(credential, GOOGLE_JWKS, {
        audience: deps.googleClientId,
        issuer: ["https://accounts.google.com", "accounts.google.com"]
    });

    const email = typeof payload.email === "string" ? payload.email : "";
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const name = typeof payload.name === "string" ? payload.name : "";
    const picture = typeof payload.picture === "string" ? payload.picture : "";
    const emailVerified = Boolean(payload.email_verified);

    if (!email || !sub) throw new Error("ID token incompleto (sin email/sub).");
    if (!emailVerified) throw new Error("El email de Google no está verificado.");

    return { email, sub, name, picture };
}
