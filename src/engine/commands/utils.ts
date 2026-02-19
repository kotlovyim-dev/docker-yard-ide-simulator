import { v4 as uuidv4 } from "uuid";
import { EngineContext, EngineEvent, ContainerRecord, ImageRecord } from "../types";

export type CommandResult = {
    context: Partial<EngineContext>;
    events: EngineEvent[];
    output: string[];
};

export function createEvent(
    type: string,
    payload: Record<string, unknown>,
    humanSummary: string
): EngineEvent {
    return {
        id: uuidv4(),
        type,
        timestamp: new Date().toISOString(),
        payload,
        humanSummary,
    };
}

export function fakeId(): string {
    return uuidv4().replace(/-/g, "").substring(0, 12);
}

export function fakeDigest(): string {
    return `sha256:${uuidv4().replace(/-/g, "")}`;
}

export function formatSize(bytes: number): string {
    if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)}GB`;
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)}MB`;
    return `${(bytes / 1_000).toFixed(1)}kB`;
}

export function padEnd(str: string, len: number): string {
    return str.length >= len ? str : str + " ".repeat(len - str.length);
}

export function resolveContainer(
    ctx: EngineContext,
    nameOrId: string
): ContainerRecord | undefined {
    return Object.values(ctx.containers).find(
        (c) => c.id === nameOrId || c.name === nameOrId || c.id.startsWith(nameOrId)
    ) as ContainerRecord | undefined;
}

export function resolveImage(ctx: EngineContext, ref: string): ImageRecord | undefined {
    const withTag = ref.includes(":") ? ref : `${ref}:latest`;
    return ctx.images[withTag] ?? ctx.images[ref];
}
