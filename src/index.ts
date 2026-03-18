import { handleRequest } from "./presentation/http/handleRequest";

type Env = {
    APPWRITE_ENDPOINT: string;
    APPWRITE_PROJECT_ID: string;
    APPWRITE_API_KEY: string;
    GOOGLE_CLIENT_ID: string;
    ALLOW_CREATE?: string;
    CORS_ORIGIN?: string;
};

export default {
    async fetch(req: Request, env: Env): Promise<Response> {
        return await handleRequest(req, env);
    }
};
