import { z } from "zod";
import {
    EngineContext,
    EngineEvent,
    ParsedCommand,
    ContainerRecord,
    ImageRecord,
    PortMapping,
} from "../types";
import { v4 as uuidv4 } from "uuid";

const PullCommandSchema = z.object({
    command: z.literal("docker"),
    subcommand: z.literal("pull"),
    args: z.tuple([z.string()]),
});

const RunCommandFlagsSchema = z.object({
    d: z.boolean().optional(),
    p: z.union([z.string(), z.array(z.string())]).optional(),
    name: z.string().optional(),
    rm: z.boolean().optional(),
});

const RunCommandSchema = z.object({
    command: z.literal("docker"),
    subcommand: z.literal("run"),
    args: z.array(z.string()).min(1),
});

function createEvent(
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

function handlePull(
    ctx: EngineContext,
    cmd: ParsedCommand
): { context: Partial<EngineContext>; events: EngineEvent[]; output: string[] } {
    const validation = PullCommandSchema.safeParse(cmd);
    if (!validation.success) {
        return {
            context: {},
            events: [],
            output: ["Usage: docker pull <image:tag>"],
        };
    }

    const imageTag = cmd.args[0];
    const [repo, tag] = imageTag.split(":");
    const finalTag = tag || "latest";
    const fullName = `${repo}:${finalTag}`;

    const newImage: ImageRecord = {
        id: `sha256:${uuidv4().substring(0, 12)}`,
        repository: repo,
        tag: finalTag,
        size: Math.floor(Math.random() * 100000000),
        createdAt: new Date().toISOString(),
        layers: ["sha256:layer1", "sha256:layer2"],
    };

    const event = createEvent(
        "IMAGE_PULL_COMPLETE",
        { image: newImage },
        `Pulled image ${fullName}`
    );

    return {
        context: {
            images: { ...ctx.images, [fullName]: newImage },
        },
        events: [event],
        output: [
            `Using default tag: latest`,
            `latest: Pulling from library/${repo}`,
            `Digest: ${newImage.id}`,
            `Status: Downloaded newer image for ${fullName}`,
        ],
    };
}

function handleRun(
    ctx: EngineContext,
    cmd: ParsedCommand
): { context: Partial<EngineContext>; events: EngineEvent[]; output: string[] } {
    const cmdValidation = RunCommandSchema.safeParse(cmd);
    if (!cmdValidation.success) {
        return {
            context: {},
            events: [],
            output: ["Usage: docker run [OPTIONS] IMAGE [COMMAND] [ARG...]"]
        }
    }

    const flagsValidation = RunCommandFlagsSchema.safeParse(cmd.flags);
    if (!flagsValidation.success) {
        return {
            context: {},
            events: [],
            output: ["Invalid flags for docker run"],
        };
    }
    const flags = flagsValidation.data;

    const imageArg = cmd.args[0];

    const image = ctx.images[imageArg] || ctx.images[`${imageArg}:latest`];
    if (!image) {
        return {
            context: {},
            events: [],
            output: [`Unable to find image '${imageArg}' locally`],
        };
    }

    const containerId = uuidv4().substring(0, 12);
    const name = (flags.name) || `agitated_${containerId}`;

    const containerList = Object.values(ctx.containers) as ContainerRecord[];
    if (containerList.some((c) => c.name === name)) {
        return {
            context: {},
            events: [],
            output: [`Error response from daemon: Conflict. The container name "/${name}" is already in use.`],
        };
    }

    const boundPorts: Record<string, string> = { ...ctx.boundPorts };
    const portMappings: PortMapping[] = [];

    if (flags.p) {
        const portArgs = Array.isArray(flags.p) ? flags.p : [flags.p];
        for (const p of portArgs) {
            const [host, container] = p.split(":");
            const hostPort = parseInt(host);
            const containerPort = parseInt(container);

            if (isNaN(hostPort) || isNaN(containerPort)) {
                return {
                    context: {},
                    events: [],
                    output: [`Invalid port mapping: ${p}`]
                }
            }

            if (boundPorts[hostPort.toString()]) {
                return {
                    context: {},
                    events: [],
                    output: [`Error: Bind for 0.0.0.0:${hostPort} failed: port is already allocated.`],
                };
            }

            boundPorts[hostPort.toString()] = containerId;
            portMappings.push({ hostPort, containerPort, protocol: "tcp" });
        }
    }

    const container: ContainerRecord = {
        id: containerId,
        name,
        imageId: image.id,
        status: "running",
        ports: portMappings,
        env: {},
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        stoppedAt: null,
        logs: [],
        networkIds: [],
        volumeMounts: [],
    };

    const eventCreated = createEvent(
        "CONTAINER_CREATED",
        { container },
        `Created container ${name} (${containerId})`
    );

    const eventStarted = createEvent(
        "CONTAINER_STARTED",
        { containerId },
        `Started container ${name}`
    );

    return {
        context: {
            containers: { ...ctx.containers, [containerId]: container },
            boundPorts,
        },
        events: [eventCreated, eventStarted],
        output: flags.d ? [containerId] : [`(Simulated output from ${imageArg})...`],
    };
}

export function evaluateCommand(
    ctx: EngineContext,
    cmd: ParsedCommand
): { context: Partial<EngineContext>; events: EngineEvent[]; output: string[] } {
    if (cmd.command !== "docker") {
        return {
            context: {},
            events: [],
            output: [`${cmd.command}: command not found`],
        };
    }

    switch (cmd.subcommand) {
        case "pull":
            return handlePull(ctx, cmd);
        case "run":
            return handleRun(ctx, cmd);
        case "ps":
            const lines = ["CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES"];
            const containers = Object.values(ctx.containers) as ContainerRecord[];
            containers.forEach((c) => {
                lines.push(`${c.id.substring(0, 12)}   ${c.imageId.substring(0, 12)}   "..."     Now       ${c.status}   ...       ${c.name}`);
            });
            return {
                context: {},
                events: [],
                output: lines
            }
        default:
            return {
                context: {},
                events: [],
                output: [`docker: '${cmd.subcommand}' is not a docker command.`],
            };
    }
}
