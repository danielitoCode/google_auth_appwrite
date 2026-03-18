import type { ExchangeBody, ExchangeResult } from "../../domain/exchange";

import type { Logger } from "../../shared/logger";
import { verifyGoogleIdToken } from "../../infrastructure/google/verifyGoogleIdToken";
import { AppwriteUsersRepository, isGoogleLinked } from "../../infrastructure/appwrite/AppwriteUsersRepository";

export type ExchangeGoogleCredentialDeps = {
    googleClientId: string;
    allowCreateDefault: boolean;
    usersRepo: AppwriteUsersRepository;
    logger: Logger;
};

export async function exchangeGoogleCredential(
    body: ExchangeBody,
    deps: ExchangeGoogleCredentialDeps
): Promise<ExchangeResult> {
    const profile = await verifyGoogleIdToken(body.credential, { googleClientId: deps.googleClientId });
    const allowCreate = Boolean(body.allowCreate) || deps.allowCreateDefault;

    let user = await deps.usersRepo.findUserByEmail(profile.email);

    if (!user) {
        if (!allowCreate) return { kind: "register_required", ...profile };
        deps.logger.info("google_auth.user_create", { email: profile.email });
        user = await deps.usersRepo.createUserFromGoogle(profile);
    }

    const prefs = user?.prefs && typeof user.prefs === "object" ? user.prefs : {};
    if (!isGoogleLinked(prefs, profile.sub)) {
        deps.logger.info("google_auth.link_required", { email: profile.email, userId: user.$id });
        return { kind: "link_required", userId: user.$id, ...profile };
    }

    const token = await deps.usersRepo.createSessionToken(user.$id);
    if (!token?.secret) throw new Error("No se pudo crear token de sesión.");

    deps.logger.info("google_auth.session_issued", { email: profile.email, userId: user.$id });
    return { kind: "session", userId: user.$id, secret: token.secret, ...profile };
}
