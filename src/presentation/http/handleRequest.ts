import type { ExchangeBody } from "../../domain/exchange";

import { exchangeGoogleCredential } from "../../application/usecases/exchangeGoogleCredential";
import { AppwriteUsersRepository } from "../../infrastructure/appwrite/AppwriteUsersRepository";
import { createConsoleLogger } from "../../shared/logger";
import { json, parseJson, requestId, withCors } from "../../shared/http";

type Env = {
    APPWRITE_ENDPOINT: string;
    APPWRITE_PROJECT_ID: string;
    APPWRITE_API_KEY: string;
    GOOGLE_CLIENT_ID: string;
    ALLOW_CREATE?: string;
    CORS_ORIGIN?: string;
};

export async function handleRequest(req: Request, env: Env): Promise<Response> {
    const rid = requestId();
    const cfRay = req.headers.get("cf-ray") || undefined;
    const origin = req.headers.get("origin") || undefined;

    const logger = createConsoleLogger({ rid, cfRay });

    if (req.method === "OPTIONS") {
        logger.info("google_auth.preflight", { origin });
        return withCors(req, env.CORS_ORIGIN, new Response(null, { status: 204 }));
    }

    if (req.method === "GET") {
        logger.info("google_auth.health");
        return withCors(req, env.CORS_ORIGIN, json(200, { ok: true }));
    }

    if (req.method !== "POST") {
        logger.info("google_auth.method_not_allowed", { method: req.method });
        return withCors(req, env.CORS_ORIGIN, json(405, { error: "Method not allowed" }));
    }

    const body = await parseJson<Partial<ExchangeBody> & { action?: string }>(req);
    if (!body || typeof body.credential !== "string" || (body.action && body.action !== "exchange")) {
        logger.info("google_auth.bad_request");
        return withCors(req, env.CORS_ORIGIN, json(400, { error: "Body inválido" }));
    }

    try {
        logger.info("google_auth.exchange_start");

        const usersRepo = new AppwriteUsersRepository({
            endpoint: env.APPWRITE_ENDPOINT,
            projectId: env.APPWRITE_PROJECT_ID,
            apiKey: env.APPWRITE_API_KEY
        });

        const result = await exchangeGoogleCredential(
            { credential: body.credential, allowCreate: Boolean(body.allowCreate) },
            {
                googleClientId: env.GOOGLE_CLIENT_ID,
                allowCreateDefault: env.ALLOW_CREATE === "1",
                usersRepo,
                logger
            }
        );

        logger.info("google_auth.exchange_ok", {
            kind: result.kind,
            email: result.email,
            userId: "userId" in result ? result.userId : undefined
        });

        return withCors(req, env.CORS_ORIGIN, json(200, result));
    } catch (e) {
        const message = e instanceof Error ? e.message : "Error inesperado";
        logger.error("google_auth.exchange_error", { error: message });
        return withCors(req, env.CORS_ORIGIN, json(400, { error: message }));
    }
}
