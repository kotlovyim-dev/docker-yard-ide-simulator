import { EngineContext, ContainerRecord, ParsedCommand, Diagnostic } from "../../types";
import { CommandResult, createEvent, fakeId, padEnd } from "../utils";
import { validateCompose } from "../../validators/compose";

export function handleComposeUp(ctx: EngineContext, cmd: ParsedCommand, composeContent?: string): CommandResult {
    const detached = cmd.flags["d"] === true;
    const services = ["web", "db"];
    const updatedContainers = { ...ctx.containers };
    const events = [];
    const output: string[] = [];

    if (composeContent !== undefined) {
        const diagnostics = validateCompose(composeContent);
        const errors = diagnostics.filter((d: Diagnostic) => d.severity === "error");
        const warnings = diagnostics.filter((d: Diagnostic) => d.severity === "warning");

        warnings.forEach((w: Diagnostic) => output.push(`WARNING: [${w.ruleId}] ${w.message}`));

        if (errors.length > 0) {
            errors.forEach((e: Diagnostic) => output.push(`Error [${e.ruleId}]: ${e.message}`));
            output.push(``, `validating compose file: compose validation failed.`);
            return {
                context: {},
                events: [createEvent("COMPOSE_FAILED", { errors }, "Compose validation failed")],
                output,
            };
        }

        if (output.length > 0) output.push("");
    }

    for (const svcName of services) {
        const alreadyRunning = Object.values(updatedContainers).some(
            (c) => c.name === svcName && c.status === "running"
        );
        if (alreadyRunning) {
            output.push(` Container ${svcName}  Running`);
            continue;
        }

        const containerId = fakeId();
        const container: ContainerRecord = {
            id: containerId,
            name: svcName,
            imageId: `sha256:compose-${svcName}`,
            status: "running",
            ports: [],
            env: {},
            createdAt: new Date().toISOString(),
            startedAt: new Date().toISOString(),
            stoppedAt: null,
            logs: [`${svcName} | started`],
            networkIds: [],
            volumeMounts: [],
        };

        updatedContainers[containerId] = container;
        events.push(createEvent("COMPOSE_SERVICE_STARTED", { service: svcName, containerId }, `Compose service ${svcName} started`));
        output.push(` Container ${svcName}  Created`);
        if (detached) output.push(` Container ${svcName}  Started`);
    }

    if (!detached) {
        output.push(`Attaching to ${services.join(", ")}`);
        services.forEach((s) => output.push(`${s}  | (simulated output)`));
    }

    return { context: { containers: updatedContainers }, events, output };
}

export function handleComposeDown(ctx: EngineContext): CommandResult {
    const updatedContainers = { ...ctx.containers };
    const updatedBoundPorts = { ...ctx.boundPorts };
    const events = [];
    const output: string[] = [];

    for (const c of Object.values(updatedContainers) as ContainerRecord[]) {
        if (c.status === "removed") continue;
        c.ports.forEach((pm) => { delete updatedBoundPorts[String(pm.hostPort)]; });
        updatedContainers[c.id] = { ...c, status: "removed" };
        events.push(createEvent("COMPOSE_SERVICE_STOPPED", { service: c.name, containerId: c.id }, `Compose service ${c.name} stopped and removed`));
        output.push(` Container ${c.name}  Stopped`, ` Container ${c.name}  Removed`);
    }

    return { context: { containers: updatedContainers, boundPorts: updatedBoundPorts }, events, output };
}

export function handleComposePs(ctx: EngineContext): CommandResult {
    const header =
        padEnd("NAME", 20) +
        padEnd("IMAGE", 20) +
        padEnd("COMMAND", 12) +
        padEnd("SERVICE", 14) +
        padEnd("CREATED", 18) +
        padEnd("STATUS", 12) +
        "PORTS";

    const rows = (Object.values(ctx.containers) as ContainerRecord[])
        .filter((c) => c.status !== "removed")
        .map((c) => {
            const ports = c.ports.map((p) => `${p.hostPort}->${p.containerPort}`).join(", ");
            return (
                padEnd(c.name, 20) +
                padEnd(c.imageId.substring(0, 18), 20) +
                padEnd('"..."', 12) +
                padEnd(c.name, 14) +
                padEnd(c.createdAt.substring(0, 16).replace("T", " "), 18) +
                padEnd(c.status, 12) +
                ports
            );
        });

    return { context: {}, events: [], output: [header, ...rows] };
}

export function handleComposeLogs(ctx: EngineContext, cmd: ParsedCommand): CommandResult {
    const tailFlag = cmd.flags["tail"];
    const tailN = typeof tailFlag === "string" ? parseInt(tailFlag, 10) : NaN;
    const output: string[] = [];

    for (const c of Object.values(ctx.containers) as ContainerRecord[]) {
        if (c.status === "removed") continue;
        const logs = c.logs.length > 0 ? c.logs : [`${c.name} | (no log output)`];
        const sliced = !isNaN(tailN) ? logs.slice(-tailN) : logs;
        sliced.forEach((line) => output.push(`${c.name}  | ${line}`));
    }

    return { context: {}, events: [], output };
}
