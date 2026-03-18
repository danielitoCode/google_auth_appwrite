import type { GoogleProfile } from "./google";

export type ExchangeBody = {
    credential: string;
    allowCreate?: boolean;
};

export type ExchangeResult =
    | ({ kind: "session"; userId: string; secret: string } & GoogleProfile)
    | ({ kind: "link_required"; userId: string } & GoogleProfile)
    | ({ kind: "register_required" } & GoogleProfile);
