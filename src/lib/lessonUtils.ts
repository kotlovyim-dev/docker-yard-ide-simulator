import type {
    EngineContext,
    ScenarioSnapshot,
    ContainerRecord,
    WorkspaceFile,
} from "@/engine/types";

function buildBoundPorts(
    containers: Record<string, ContainerRecord>,
): Record<string, string> {
    const bound: Record<string, string> = {};
    for (const c of Object.values(containers)) {
        if (c.status === "removed") continue;
        for (const pm of c.ports) {
            bound[String(pm.hostPort)] = c.id;
        }
    }
    return bound;
}

export function buildEngineSnapshot(snapshot: ScenarioSnapshot): EngineContext {
    return {
        images: snapshot.images,
        containers: snapshot.containers,
        networks: {},
        volumes: {},
        composeStacks: {},
        eventLog: [],
        boundPorts: buildBoundPorts(snapshot.containers),
        pendingCommand: null,
        lastError: null,
    };
}

export function buildWorkspaceSnapshot(files: Record<string, WorkspaceFile>) {
    const paths = Object.keys(files);
    const firstPath = paths[0] ?? null;
    return {
        files,
        activeFilePath: firstPath,
        openTabs: firstPath ? [firstPath] : [],
        diagnostics: {},
    };
}
