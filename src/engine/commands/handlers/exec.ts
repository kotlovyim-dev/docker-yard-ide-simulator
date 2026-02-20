import { EngineContext, ParsedCommand } from "../../types";
import { CommandResult, createEvent, resolveContainer } from "../utils";

export function handleLogs(
    ctx: EngineContext,
    cmd: ParsedCommand,
): CommandResult {
    if (cmd.args.length === 0) {
        return {
            context: {},
            events: [],
            output: ["Usage: docker logs [OPTIONS] CONTAINER"],
        };
    }

    const c = resolveContainer(ctx, cmd.args[0]);
    if (!c) {
        return {
            context: {},
            events: [],
            output: [
                `Error response from daemon: No such container: ${cmd.args[0]}`,
            ],
        };
    }

    const tailFlag = cmd.flags["tail"];
    const tailN = typeof tailFlag === "string" ? parseInt(tailFlag, 10) : NaN;
    const logs = c.logs.length > 0 ? c.logs : [`${c.name} | (no log output)`];
    const sliced = !isNaN(tailN) ? logs.slice(-tailN) : logs;
    const followNote =
        cmd.flags["f"] === true
            ? [`(Following logs for ${c.name} — press Ctrl+C to stop)`]
            : [];

    return { context: {}, events: [], output: [...followNote, ...sliced] };
}

export function handleExec(
    ctx: EngineContext,
    cmd: ParsedCommand,
): CommandResult {
    const hasIt = cmd.flags["i"] === true && cmd.flags["t"] === true;
    if (!hasIt || cmd.args.length < 2) {
        return {
            context: {},
            events: [],
            output: ["Usage: docker exec -it CONTAINER COMMAND [ARG...]"],
        };
    }

    const c = resolveContainer(ctx, cmd.args[0]);
    if (!c) {
        return {
            context: {},
            events: [],
            output: [
                `Error response from daemon: No such container: ${cmd.args[0]}`,
            ],
        };
    }

    if (c.status !== "running") {
        return {
            context: {},
            events: [],
            output: [
                `Error response from daemon: Container ${c.name} is not running`,
                `Explain: Standard exec prerequisite — the container must be running.`,
            ],
        };
    }

    const execCmd = cmd.args.slice(1).join(" ");
    const lowerCmd = execCmd.toLowerCase();

    const event = createEvent(
        "EXEC_COMMAND_RUN",
        { containerId: c.id, cmd: execCmd },
        `Ran '${execCmd}' in ${c.name}`,
    );

    if (lowerCmd === "env") {
        const defaults: Record<string, string> = {
            PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
            HOSTNAME: c.name,
            TERM: "xterm-256color",
        };
        const merged = { ...defaults, ...c.env };
        const envLines = Object.entries(merged).map(([k, v]) => `${k}=${v}`);
        return { context: {}, events: [event], output: envLines };
    }

    if (lowerCmd === "cat /etc/os-release") {
        const imgEntry = Object.entries(ctx.images).find(
            ([, img]) => img.id === c.imageId,
        );
        const imageRef = imgEntry ? imgEntry[0] : c.imageId;
        const imgName = imageRef ? imageRef.split(":")[0] : "linux";
        return {
            context: {},
            events: [event],
            output: [
                `PRETTY_NAME="Simulated ${imgName} Linux"`,
                `NAME="SimOS"`,
                `ID=simdocker`,
                `HOME_URL="https://docker-yard.dev/"`,
            ],
        };
    }

    if (lowerCmd === "ls /app") {
        return {
            context: {},
            events: [event],
            output: ["index.js  node_modules  package.json"],
        };
    }

    if (lowerCmd === "sh" || lowerCmd === "bash") {
        return {
            context: {},
            events: [event],
            output: [
                `Welcome to ${c.name} (${lowerCmd})`,
                "This is a simulated shell. Try: env, ls /app, cat /etc/os-release",
            ],
        };
    }

    const bin = execCmd.split(" ")[0];
    return {
        context: {},
        events: [],
        output: [
            `OCI runtime exec failed: exec failed: unable to start container process: exec: "${bin}": executable file not found in $PATH`,
        ],
    };
}
