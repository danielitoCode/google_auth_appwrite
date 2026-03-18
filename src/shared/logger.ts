export type Logger = {
    info: (event: string, meta?: Record<string, unknown>) => void;
    error: (event: string, meta?: Record<string, unknown>) => void;
};

export function createConsoleLogger(baseMeta?: Record<string, unknown>): Logger {
    return {
        info(event, meta) {
            console.log(JSON.stringify({ level: "info", event, ...(baseMeta ?? {}), ...(meta ?? {}) }));
        },
        error(event, meta) {
            console.log(JSON.stringify({ level: "error", event, ...(baseMeta ?? {}), ...(meta ?? {}) }));
        }
    };
}
