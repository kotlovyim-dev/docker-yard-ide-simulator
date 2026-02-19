import { EngineContext, ContainerRecord, ParsedCommand, PortMapping } from "../../types";
import { CommandResult, createEvent, fakeId, padEnd, resolveContainer, resolveImage } from "../utils";

export function handleRun(ctx: EngineContext, cmd: ParsedCommand): CommandResult {
    if (cmd.args.length === 0) {
        return { context: {}, events: [], output: ["Usage: docker run [OPTIONS] IMAGE [COMMAND] [ARG...]"] };
    }

    const image = resolveImage(ctx, cmd.args[0]);
    if (!image) {
        const ref = cmd.args[0];
        return {
            context: {},
            events: [],
            output: [
                `Unable to find image '${ref}' locally`,
                `docker: Error response from daemon: pull access denied for ${ref}, repository does not exist or may require 'docker login': denied: requested access to the resource is denied.`,
                `See 'docker run --help'.`,
                ``,
                `Explain: Image ${ref} does not exist in the simulated registry. Try docker pull nginx.`,
            ],
        };
    }

    const flags = cmd.flags;
    const name = typeof flags["name"] === "string" ? flags["name"] : `agitated_${fakeId()}`;
    const detached = flags["d"] === true;

    const nameConflict = Object.values(ctx.containers).some(
        (c) => c.name === name && c.status !== "removed"
    );
    if (nameConflict) {
        return {
            context: {},
            events: [],
            output: [
                `Error response from daemon: Conflict. The container name "/${name}" is already in use by container. You have to remove (or rename) that container to be able to reuse that name.`,
                ``,
                `Explain: Docker requires unique container names. Use --rm or docker rm ${name} first.`,
            ],
        };
    }

    const newBoundPorts: Record<string, string> = { ...ctx.boundPorts };
    const portMappings: PortMapping[] = [];
    const rawPorts = flags["p"];
    const portArgs = Array.isArray(rawPorts) ? rawPorts : typeof rawPorts === "string" ? [rawPorts] : [];

    for (const p of portArgs) {
        const parts = p.split(":");
        if (parts.length !== 2) {
            return { context: {}, events: [], output: [`docker: invalid port specification: "${p}". See 'docker run --help'.`] };
        }
        const hostPort = parseInt(parts[0], 10);
        const containerPort = parseInt(parts[1], 10);
        if (isNaN(hostPort) || isNaN(containerPort)) {
            return { context: {}, events: [], output: [`docker: invalid port specification: "${p}". See 'docker run --help'.`] };
        }
        if (newBoundPorts[String(hostPort)]) {
            return {
                context: {},
                events: [],
                output: [
                    `Error: failed to create endpoint on network bridge: Bind for 0.0.0.0:${hostPort} failed: port is already allocated.`,
                    ``,
                    `Explain: Port ${hostPort} is occupied by another running container.`,
                ],
            };
        }
        newBoundPorts[String(hostPort)] = "pending";
        portMappings.push({ hostPort, containerPort, protocol: "tcp" });
    }

    const rawEnv = flags["e"];
    const envArgs = Array.isArray(rawEnv) ? rawEnv : typeof rawEnv === "string" ? [rawEnv] : [];
    const env: Record<string, string> = {};
    for (const e of envArgs) {
        const idx = e.indexOf("=");
        if (idx > 0) env[e.substring(0, idx)] = e.substring(idx + 1);
    }

    const containerId = fakeId();
    portMappings.forEach((pm) => { newBoundPorts[String(pm.hostPort)] = containerId; });

    const container: ContainerRecord = {
        id: containerId,
        name,
        imageId: image.id,
        status: "running",
        ports: portMappings,
        env,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        stoppedAt: null,
        logs: [`${name} - started`],
        networkIds: [],
        volumeMounts: [],
    };

    const events = [
        ...(portMappings.length > 0
            ? [createEvent("PORT_BOUND", { ports: portMappings, containerId }, `Bound ports ${portMappings.map((pm) => `${pm.hostPort}→${pm.containerPort}`).join(", ")} for container ${name}`)]
            : []),
        createEvent("CONTAINER_CREATED", { container }, `Created container ${name} (${containerId})`),
        createEvent("CONTAINER_STARTED", { containerId, name }, `Started container ${name}`),
    ];

    return {
        context: {
            containers: { ...ctx.containers, [containerId]: container },
            boundPorts: newBoundPorts,
        },
        events,
        output: detached
            ? [containerId]
            : [`Attaching to ${name}`, `${name}  | (simulated stdout from ${image.repository}:${image.tag})`],
    };
}

export function handlePs(ctx: EngineContext, cmd: ParsedCommand): CommandResult {
    const showAll = cmd.flags["a"] === true;
    const containers = (Object.values(ctx.containers) as ContainerRecord[]).filter(
        (c) => showAll || c.status === "running"
    );

    const header =
        padEnd("CONTAINER ID", 14) +
        padEnd("IMAGE", 20) +
        padEnd("COMMAND", 12) +
        padEnd("CREATED", 18) +
        padEnd("STATUS", 12) +
        padEnd("PORTS", 24) +
        "NAMES";

    const rows = containers.map((c) => {
        const imgEntry = Object.entries(ctx.images).find(([, img]) => img.id === c.imageId);
        const imgName = imgEntry ? imgEntry[0] : c.imageId.substring(0, 12);
        const ports = c.ports.map((p) => `0.0.0.0:${p.hostPort}->${p.containerPort}/tcp`).join(", ");
        return (
            padEnd(c.id.substring(0, 12), 14) +
            padEnd(imgName.substring(0, 18), 20) +
            padEnd('"..."', 12) +
            padEnd(c.createdAt.substring(0, 16).replace("T", " "), 18) +
            padEnd(c.status, 12) +
            padEnd(ports.substring(0, 22), 24) +
            c.name
        );
    });

    return { context: {}, events: [], output: [header, ...rows] };
}

export function handleStop(ctx: EngineContext, cmd: ParsedCommand): CommandResult {
    if (cmd.args.length === 0) {
        return { context: {}, events: [], output: ["Usage: docker stop CONTAINER [CONTAINER...]"] };
    }

    const updatedContainers = { ...ctx.containers };
    const updatedBoundPorts = { ...ctx.boundPorts };
    const events = [];
    const output: string[] = [];

    for (const nameOrId of cmd.args) {
        const c = resolveContainer(ctx, nameOrId);
        if (!c) {
            output.push(`Error response from daemon: No such container: ${nameOrId}`);
            continue;
        }
        if (c.status === "stopped") {
            output.push(`Error response from daemon: container ${c.name} is not running`);
            output.push(`Explain: The container is already stopped.`);
            continue;
        }

        updatedContainers[c.id] = { ...c, status: "stopped", stoppedAt: new Date().toISOString() };
        c.ports.forEach((pm) => { delete updatedBoundPorts[String(pm.hostPort)]; });

        events.push(createEvent("CONTAINER_STOPPED", { containerId: c.id, name: c.name }, `Stopped container ${c.name}`));
        if (c.ports.length > 0) {
            events.push(createEvent("PORT_RELEASED", { ports: c.ports, containerId: c.id }, `Released ports for container ${c.name}`));
        }
        output.push(c.name);
    }

    return { context: { containers: updatedContainers, boundPorts: updatedBoundPorts }, events, output };
}

export function handleStart(ctx: EngineContext, cmd: ParsedCommand): CommandResult {
    if (cmd.args.length === 0) {
        return { context: {}, events: [], output: ["Usage: docker start CONTAINER [CONTAINER...]"] };
    }

    const updatedContainers = { ...ctx.containers };
    const updatedBoundPorts = { ...ctx.boundPorts };
    const events = [];
    const output: string[] = [];

    for (const nameOrId of cmd.args) {
        const c = resolveContainer(ctx, nameOrId);
        if (!c) {
            output.push(`Error response from daemon: No such container: ${nameOrId}`);
            continue;
        }
        if (c.status === "running") {
            output.push(c.name);
            continue;
        }

        let portConflict = false;
        for (const pm of c.ports) {
            const occupant = updatedBoundPorts[String(pm.hostPort)];
            if (occupant && occupant !== c.id) {
                output.push(
                    `Error response from daemon: driver failed programming external connectivity on endpoint ${c.name}: Bind for 0.0.0.0:${pm.hostPort} failed: port is already allocated.`,
                    `Explain: Port ${pm.hostPort} is occupied by another running container.`
                );
                portConflict = true;
                break;
            }
            updatedBoundPorts[String(pm.hostPort)] = c.id;
        }
        if (portConflict) continue;

        updatedContainers[c.id] = { ...c, status: "running", startedAt: new Date().toISOString(), stoppedAt: null };
        events.push(createEvent("CONTAINER_STARTED", { containerId: c.id, name: c.name }, `Started container ${c.name}`));
        output.push(c.name);
    }

    return { context: { containers: updatedContainers, boundPorts: updatedBoundPorts }, events, output };
}

export function handleRm(ctx: EngineContext, cmd: ParsedCommand): CommandResult {
    if (cmd.args.length === 0) {
        return { context: {}, events: [], output: ["Usage: docker rm [OPTIONS] CONTAINER [CONTAINER...]"] };
    }

    const force = cmd.flags["f"] === true;
    const updatedContainers = { ...ctx.containers };
    const updatedBoundPorts = { ...ctx.boundPorts };
    const events = [];
    const output: string[] = [];

    for (const nameOrId of cmd.args) {
        const c = resolveContainer(ctx, nameOrId);
        if (!c) {
            output.push(`Error response from daemon: No such container: ${nameOrId}`);
            continue;
        }
        if (c.status === "running" && !force) {
            output.push(
                `Error response from daemon: You cannot remove a running container ${c.id}. Stop the container before attempting removal or force remove.`,
                `Explain: Stop the container first with docker stop, or use docker rm -f.`
            );
            continue;
        }

        if (c.status === "running") {
            c.ports.forEach((pm) => { delete updatedBoundPorts[String(pm.hostPort)]; });
        }
        updatedContainers[c.id] = { ...c, status: "removed" };
        events.push(createEvent("CONTAINER_REMOVED", { containerId: c.id, name: c.name }, `Removed container ${c.name}`));
        output.push(c.name);
    }

    return { context: { containers: updatedContainers, boundPorts: updatedBoundPorts }, events, output };
}
