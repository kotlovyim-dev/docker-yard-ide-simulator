import {
    EngineContext,
    ContainerRecord,
    ParsedCommand,
    Diagnostic,
    ComposeStack,
} from "../../types";
import {
    CommandResult,
    createEvent,
    fakeId,
    padEnd,
    resolveImage,
} from "../utils";
import { validateCompose } from "../../validators/compose";
import {
    parseYaml,
    asDoc,
    asString,
    asArray,
    type YamlDoc,
} from "../../validators/yaml";

interface ServiceDef {
    image?: string;
    build?: string | YamlDoc;
    ports?: string[];
    environment?: Record<string, string>;
    depends_on?: string[];
    logs?: string[];
}

function parseServices(
    composeContent: string,
): Record<string, ServiceDef> | null {
    const { doc, error } = parseYaml(composeContent);
    if (error || !doc) return null;

    const servicesRaw = asDoc(doc["services"]);
    if (!servicesRaw) return null;

    const services: Record<string, ServiceDef> = {};

    for (const [name, raw] of Object.entries(servicesRaw)) {
        const svc = asDoc(raw);
        if (!svc) continue;

        const def: ServiceDef = {};

        const imgVal = asString(svc["image"]);
        if (imgVal) def.image = imgVal;

        if (svc["build"] !== undefined) {
            const buildStr = asString(svc["build"]);
            if (buildStr) {
                def.build = buildStr;
            } else {
                const buildDoc = asDoc(svc["build"]);
                if (buildDoc) def.build = buildDoc;
            }
        }

        const portsRaw = asArray(svc["ports"]);
        if (portsRaw) {
            def.ports = portsRaw
                .map((p) => asString(p))
                .filter((p): p is string => p !== null);
        }

        const envRaw = svc["environment"];
        if (envRaw) {
            def.environment = {};
            if (Array.isArray(envRaw)) {
                for (const entry of envRaw) {
                    const s = asString(entry);
                    if (!s) continue;
                    const eq = s.indexOf("=");
                    if (eq === -1) def.environment[s] = "";
                    else def.environment[s.slice(0, eq)] = s.slice(eq + 1);
                }
            } else {
                const envDoc = asDoc(envRaw);
                if (envDoc) {
                    for (const [k, v] of Object.entries(envDoc)) {
                        def.environment[k] = asString(v) ?? "";
                    }
                }
            }
        }

        const depRaw = svc["depends_on"];
        if (depRaw) {
            if (Array.isArray(depRaw)) {
                def.depends_on = depRaw
                    .map((d) => asString(d))
                    .filter((d): d is string => d !== null);
            } else {
                const depDoc = asDoc(depRaw);
                if (depDoc) def.depends_on = Object.keys(depDoc);
            }
        }

        services[name] = def;
    }

    return services;
}

function topoSort(services: Record<string, ServiceDef>): string[] | null {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    function visit(name: string): boolean {
        if (visiting.has(name)) return false;
        if (visited.has(name)) return true;
        visiting.add(name);
        for (const dep of services[name]?.depends_on ?? []) {
            if (services[dep] === undefined) continue;
            if (!visit(dep)) return false;
        }
        visiting.delete(name);
        visited.add(name);
        result.push(name);
        return true;
    }

    for (const name of Object.keys(services)) {
        if (!visit(name)) return null;
    }

    return result;
}

function parsePort(
    portStr: string,
): { hostPort: number; containerPort: number; protocol: "tcp" | "udp" } | null {
    const proto = portStr.endsWith("/udp")
        ? ("udp" as const)
        : ("tcp" as const);
    const clean = portStr.replace(/\/(tcp|udp)$/, "");
    const parts = clean.split(":");
    if (parts.length < 2) return null;
    const host = parseInt(parts[parts.length - 2], 10);
    const container = parseInt(parts[parts.length - 1], 10);
    if (isNaN(host) || isNaN(container)) return null;
    return { hostPort: host, containerPort: container, protocol: proto };
}

function resolveServiceImage(
    ctx: EngineContext,
    svc: ServiceDef,
    svcName: string,
): { imageKey: string; found: boolean } {
    if (svc.image) {
        const withTag = svc.image.includes(":")
            ? svc.image
            : `${svc.image}:latest`;
        return { imageKey: withTag, found: !!resolveImage(ctx, svc.image) };
    }
    if (svc.build !== undefined) {
        const builtKey = `${svcName}:latest`;
        return { imageKey: builtKey, found: !!resolveImage(ctx, svcName) };
    }
    return { imageKey: `${svcName}:latest`, found: false };
}

function serviceLogs(svcName: string, imageKey: string): string[] {
    const base = imageKey.split(":")[0].toLowerCase();
    if (
        base === "postgres" ||
        base.includes("db") ||
        base.includes("mysql") ||
        base.includes("mongo")
    ) {
        return [
            `${svcName}  | LOG:  database system was shut down at ${new Date().toISOString()}`,
            `${svcName}  | LOG:  database system is ready to accept connections`,
        ];
    }
    if (base.includes("redis")) {
        return [`${svcName}  | * Ready to accept connections`];
    }
    if (base === "nginx" || base.includes("web") || base.includes("app")) {
        return [
            `${svcName}  | /docker-entrypoint.sh: Configuration complete; ready for start up`,
        ];
    }
    return [`${svcName}  | service started`];
}

const DEFAULT_STACK_NAME = "default";





export function handleComposeUp(
    ctx: EngineContext,
    cmd: ParsedCommand,
    composeContent?: string,
): CommandResult {
    const detached = cmd.flags["d"] === true;
    const output: string[] = [];

    if (!composeContent) {
        return {
            context: {},
            events: [],
            output: [
                "validating compose file: no compose.yml found in workspace",
            ],
        };
    }

    
    const diagnostics = validateCompose(composeContent);
    const errors = diagnostics.filter(
        (d: Diagnostic) => d.severity === "error",
    );
    const warnings = diagnostics.filter(
        (d: Diagnostic) => d.severity === "warning",
    );

    warnings.forEach((w: Diagnostic) =>
        output.push(`WARNING: [${w.ruleId}] ${w.message}`),
    );
    if (warnings.length > 0) output.push("");

    if (errors.length > 0) {
        output.push("validating compose file: compose validation failed.");
        errors.forEach((e: Diagnostic) =>
            output.push(`  Error [${e.ruleId}]: ${e.message}`),
        );
        return {
            context: {},
            events: [
                createEvent(
                    "COMPOSE_FAILED",
                    { errors },
                    "Compose validation failed",
                ),
            ],
            output,
        };
    }

    
    const services = parseServices(composeContent);
    if (!services || Object.keys(services).length === 0) {
        return {
            context: {},
            events: [],
            output: ["validating compose file: no services defined"],
        };
    }

    
    const missingImages: string[] = [];
    for (const [svcName, svc] of Object.entries(services)) {
        const { found } = resolveServiceImage(ctx, svc, svcName);
        if (!found) {
            if (svc.image) {
                missingImages.push(
                    `  Service '${svcName}': image '${svc.image}' not found locally. Run 'docker pull ${svc.image}' first.`,
                );
            } else if (svc.build !== undefined) {
                const buildCtx =
                    typeof svc.build === "string" ? svc.build : ".";
                missingImages.push(
                    `  Service '${svcName}': no built image found for build context '${buildCtx}'. Run 'docker build -t ${svcName} ${buildCtx}' first.`,
                );
            }
        }
    }
    if (missingImages.length > 0) {
        return {
            context: {},
            events: [],
            output: [
                "validating compose file: compose validation failed.",
                ...missingImages,
            ],
        };
    }

    
    const ordered = topoSort(services);
    if (!ordered) {
        return {
            context: {},
            events: [],
            output: ["error: circular dependency detected in depends_on"],
        };
    }

    const updatedContainers = { ...ctx.containers };
    const updatedBoundPorts = { ...ctx.boundPorts };
    const updatedStacks = { ...(ctx.composeStacks ?? {}) };
    const events = [];

    const existingStack = updatedStacks[DEFAULT_STACK_NAME];
    const stackContainerIds: Record<string, string> = existingStack
        ? { ...existingStack.containerIds }
        : {};

    output.push(`[+] Running ${ordered.length}/0`);

    for (const svcName of ordered) {
        const svc = services[svcName];

        
        const existingId = stackContainerIds[svcName];
        if (existingId && updatedContainers[existingId]?.status === "running") {
            output.push(` ✔ Container ${svcName}  Running`);
            continue;
        }

        
        const portMappings: ContainerRecord["ports"] = [];
        let portConflict: string | null = null;
        for (const portStr of svc.ports ?? []) {
            const pm = parsePort(portStr);
            if (!pm) continue;
            if (updatedBoundPorts[String(pm.hostPort)]) {
                portConflict = `Bind for 0.0.0.0:${pm.hostPort} failed: port is already allocated`;
                break;
            }
            portMappings.push(pm);
        }

        if (portConflict) {
            output.push(` ✗ Container ${svcName}  Error`);
            output.push(`Error: ${portConflict}`);
            continue;
        }

        const { imageKey } = resolveServiceImage(ctx, svc, svcName);
        const containerId = fakeId();
        const now = new Date().toISOString();

        portMappings.forEach((pm) => {
            updatedBoundPorts[String(pm.hostPort)] = containerId;
        });

        const container: ContainerRecord = {
            id: containerId,
            name: svcName,
            imageId: imageKey,
            status: "running",
            ports: portMappings,
            env: svc.environment ?? {},
            createdAt: now,
            startedAt: now,
            stoppedAt: null,
            logs: serviceLogs(svcName, imageKey),
            networkIds: [],
            volumeMounts: [],
        };

        updatedContainers[containerId] = container;
        stackContainerIds[svcName] = containerId;

        events.push(
            createEvent(
                "COMPOSE_SERVICE_STARTED",
                { service: svcName, containerId, imageKey },
                `Compose service '${svcName}' started (image: ${imageKey})`,
            ),
        );

        output.push(` ✔ Container ${svcName}  Created`);
        if (detached) output.push(` ✔ Container ${svcName}  Started`);
    }

    if (!detached) {
        output.push("");
        output.push(`Attaching to ${ordered.join(", ")}`);
        ordered.forEach((s) =>
            serviceLogs(s, services[s].image ?? `${s}:latest`).forEach((l) =>
                output.push(l),
            ),
        );
    }

    const newStack: ComposeStack = {
        name: DEFAULT_STACK_NAME,
        serviceNames: ordered,
        containerIds: stackContainerIds,
    };
    updatedStacks[DEFAULT_STACK_NAME] = newStack;

    return {
        context: {
            containers: updatedContainers,
            boundPorts: updatedBoundPorts,
            composeStacks: updatedStacks,
        },
        events,
        output,
    };
}

export function handleComposeDown(ctx: EngineContext): CommandResult {
    const stack = ctx.composeStacks?.[DEFAULT_STACK_NAME];
    const containerIdsToStop = stack
        ? Object.values(stack.containerIds)
        : Object.keys(ctx.containers);

    const updatedContainers = { ...ctx.containers };
    const updatedBoundPorts = { ...ctx.boundPorts };
    const updatedStacks = { ...(ctx.composeStacks ?? {}) };
    const events = [];
    const output: string[] = [];

    for (const cid of [...containerIdsToStop].reverse()) {
        const c = updatedContainers[cid];
        if (!c || c.status === "removed") continue;
        c.ports.forEach((pm) => {
            delete updatedBoundPorts[String(pm.hostPort)];
        });
        updatedContainers[cid] = {
            ...c,
            status: "removed",
            stoppedAt: new Date().toISOString(),
        };
        events.push(
            createEvent(
                "COMPOSE_SERVICE_STOPPED",
                { service: c.name, containerId: cid },
                `Compose service '${c.name}' stopped and removed`,
            ),
        );
        output.push(` Container ${c.name}  Stopped`);
        output.push(` Container ${c.name}  Removed`);
    }

    delete updatedStacks[DEFAULT_STACK_NAME];

    if (output.length === 0) {
        output.push("no compose stack running");
    }

    return {
        context: {
            containers: updatedContainers,
            boundPorts: updatedBoundPorts,
            composeStacks: updatedStacks,
        },
        events,
        output,
    };
}

export function handleComposePs(ctx: EngineContext): CommandResult {
    const stack = ctx.composeStacks?.[DEFAULT_STACK_NAME];
    const composeContainerIds = stack
        ? new Set(Object.values(stack.containerIds))
        : null;

    const managed = (Object.values(ctx.containers) as ContainerRecord[]).filter(
        (c) =>
            c.status !== "removed" &&
            (composeContainerIds ? composeContainerIds.has(c.id) : true),
    );

    if (managed.length === 0) {
        return {
            context: {},
            events: [],
            output: ["no compose services running"],
        };
    }

    const header =
        padEnd("NAME", 22) +
        padEnd("IMAGE", 20) +
        padEnd("SERVICE", 16) +
        padEnd("STATUS", 12) +
        "PORTS";

    const rows = managed.map((c) => {
        const ports = c.ports
            .map(
                (p) =>
                    `0.0.0.0:${p.hostPort}->${p.containerPort}/${p.protocol}`,
            )
            .join(", ");
        const svcName = stack
            ? (Object.entries(stack.containerIds).find(
                  ([, id]) => id === c.id,
              )?.[0] ?? c.name)
            : c.name;
        return (
            padEnd(c.name, 22) +
            padEnd(c.imageId.substring(0, 18), 20) +
            padEnd(svcName, 16) +
            padEnd(c.status === "running" ? "Up" : c.status, 12) +
            ports
        );
    });

    return { context: {}, events: [], output: [header, ...rows] };
}

export function handleComposeLogs(
    ctx: EngineContext,
    cmd: ParsedCommand,
): CommandResult {
    const stack = ctx.composeStacks?.[DEFAULT_STACK_NAME];
    const composeContainerIds = stack
        ? new Set(Object.values(stack.containerIds))
        : null;
    const tailFlag = cmd.flags["tail"];
    const tailN = typeof tailFlag === "string" ? parseInt(tailFlag, 10) : NaN;
    const output: string[] = [];

    const managed = (Object.values(ctx.containers) as ContainerRecord[]).filter(
        (c) =>
            c.status !== "removed" &&
            (composeContainerIds ? composeContainerIds.has(c.id) : true),
    );

    if (managed.length === 0) {
        output.push("no compose services running");
        return { context: {}, events: [], output };
    }

    for (const c of managed) {
        const logs =
            c.logs.length > 0 ? c.logs : [`${c.name}  | (no log output)`];
        const sliced = !isNaN(tailN) ? logs.slice(-tailN) : logs;
        sliced.forEach((line) =>
            output.push(line.includes("  | ") ? line : `${c.name}  | ${line}`),
        );
    }

    return { context: {}, events: [], output };
}
