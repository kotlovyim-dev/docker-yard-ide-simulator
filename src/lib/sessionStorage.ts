import { z } from "zod";
import { EngineContextSchema, WorkspaceContextSchema } from "@/engine/schema";
import type { EngineContext, WorkspaceContext } from "@/engine/types";

const SESSION_VERSION = 1;
const STORAGE_KEY = `docker-yard.session.v${SESSION_VERSION}`;

const StoredSessionSchema = z.object({
    version: z.number(),
    savedAt: z.string(),
    engine: EngineContextSchema,
    workspace: WorkspaceContextSchema,
});

export type StoredSession = z.infer<typeof StoredSessionSchema>;

export function loadStoredSession(): StoredSession | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = StoredSessionSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return null;
        if (parsed.data.version !== SESSION_VERSION) return null;
        return parsed.data;
    } catch {
        return null;
    }
}

export function saveStoredSession(
    engine: EngineContext,
    workspace: WorkspaceContext,
): void {
    if (typeof window === "undefined") return;
    const payload: StoredSession = {
        version: SESSION_VERSION,
        savedAt: new Date().toISOString(),
        engine,
        workspace,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredSession(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
}
