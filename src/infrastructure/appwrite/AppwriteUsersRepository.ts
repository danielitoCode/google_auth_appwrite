import type { GoogleProfile } from "../../domain/google";

export type AppwriteEnv = {
    endpoint: string;
    projectId: string;
    apiKey: string;
};

export type AppwriteUser = { $id: string; email?: string; name?: string; prefs?: any };

function headers(env: AppwriteEnv): Record<string, string> {
    if (!env.endpoint || !env.projectId || !env.apiKey) {
        throw new Error("Faltan variables de Appwrite: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY.");
    }
    return {
        "x-appwrite-project": env.projectId,
        "x-appwrite-key": env.apiKey,
        "content-type": "application/json"
    };
}

async function request<T>(env: AppwriteEnv, path: string, init: RequestInit): Promise<T> {
    const endpoint = env.endpoint.replace(/\/$/, "");
    const url = `${endpoint}${path}`;
    const res = await fetch(url, init);
    const text = await res.text();

    let data: any = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        // ignore
    }

    if (!res.ok) {
        const message = typeof data?.message === "string" ? data.message : `Appwrite error ${res.status}`;
        throw new Error(message);
    }

    return data as T;
}

function equalEmailQuery(email: string): string {
    const safeEmail = email.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
    return `equal("email", ["${safeEmail}"])`;
}

function randomPassword(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

export class AppwriteUsersRepository {
    constructor(private readonly env: AppwriteEnv) {}

    async getUser(userId: string): Promise<AppwriteUser> {
        return await request<AppwriteUser>(this.env, `/users/${encodeURIComponent(userId)}`, {
            method: "GET",
            headers: headers(this.env)
        });
    }

    async findUserByEmail(email: string): Promise<AppwriteUser | null> {
        let list: { users: AppwriteUser[] } | null = null;

        // Preferimos query exacta por email. Si el servidor no soporta queries aquí, hacemos fallback a search.
        try {
            const q = equalEmailQuery(email);
            list = await request<{ users: AppwriteUser[] }>(this.env, `/users?queries[]=${encodeURIComponent(q)}`, {
                method: "GET",
                headers: headers(this.env)
            });
        } catch {
            list = await request<{ users: AppwriteUser[] }>(this.env, `/users?search=${encodeURIComponent(email)}`, {
                method: "GET",
                headers: headers(this.env)
            });
        }

        const lower = email.toLowerCase();
        const hit = Array.isArray(list?.users)
            ? list.users.find((u) => String(u?.email || "").toLowerCase() === lower)
            : null;
        if (!hit) return null;

        return await this.getUser(hit.$id);
    }

    async createUserFromGoogle(profile: GoogleProfile): Promise<AppwriteUser> {
        const created = await request<AppwriteUser>(this.env, "/users", {
            method: "POST",
            headers: headers(this.env),
            body: JSON.stringify({
                userId: "unique()",
                email: profile.email,
                password: randomPassword(),
                name: profile.name || "Usuario"
            })
        });

        const userId = created?.$id;
        if (!userId) throw new Error("No se pudo crear el usuario en Appwrite.");

        const current = await this.getUser(userId);
        const prefs = current?.prefs && typeof current.prefs === "object" ? current.prefs : {};

        const merged = {
            ...prefs,
            sub: profile.sub,
            google_linked: true,
            photo_url: profile.picture || prefs.photo_url,
            name: profile.name || prefs.name
        };

        await request(this.env, `/users/${encodeURIComponent(userId)}/prefs`, {
            method: "PATCH",
            headers: headers(this.env),
            body: JSON.stringify({ prefs: merged })
        });

        return await this.getUser(userId);
    }

    async createSessionToken(userId: string): Promise<{ secret: string }> {
        return await request<{ secret: string }>(this.env, `/users/${encodeURIComponent(userId)}/tokens`, {
            method: "POST",
            headers: headers(this.env),
            body: JSON.stringify({})
        });
    }
}

export function isGoogleLinked(prefs: unknown, sub: string): boolean {
    if (!prefs || typeof prefs !== "object") return false;
    const stored = typeof (prefs as any).sub === "string" ? (prefs as any).sub : "";
    return Boolean(stored) && stored === sub;
}
