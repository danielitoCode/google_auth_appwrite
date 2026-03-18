export function requestId(): string {
    const anyCrypto = crypto as unknown as { randomUUID?: () => string };
    if (typeof anyCrypto.randomUUID === "function") return anyCrypto.randomUUID();

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // uuid v4 minimal
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function json(status: number, body: unknown, init?: ResponseInit): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            ...(init?.headers ?? {})
        }
    });
}

export async function parseJson<T>(req: Request): Promise<T | null> {
    try {
        return (await req.json()) as T;
    } catch {
        return null;
    }
}

export function withCors(req: Request, corsOrigin: string | undefined, res: Response): Response {
    const origin = req.headers.get("origin") || "";
    const allowed = corsOrigin || origin || "*";
    const headers = new Headers(res.headers);
    headers.set("access-control-allow-origin", allowed === "*" ? "*" : allowed);
    headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
    headers.set("access-control-allow-headers", "content-type, authorization");
    headers.set("vary", "origin");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
