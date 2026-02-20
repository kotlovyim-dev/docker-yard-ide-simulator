import { EngineContext, ParsedCommand, WorkspaceFile } from "../types";
import { CommandResult } from "./utils";
import { handlePull, handleImages, handleBuild } from "./handlers/image";
import {
    handleRun,
    handlePs,
    handleStop,
    handleStart,
    handleRm,
} from "./handlers/container";
import { handleLogs, handleExec } from "./handlers/exec";
import {
    handleComposeUp,
    handleComposeDown,
    handleComposePs,
    handleComposeLogs,
} from "./handlers/compose";

export type WorkspaceSnapshot = Record<string, WorkspaceFile>;

function dockerHelpOutput(): string[] {
    return [
        "Usage:  docker [OPTIONS] COMMAND",
        "",
        "Management Commands:",
        "  build     Build an image from a Dockerfile",
        "  compose   Docker Compose",
        "  exec      Run a command in a running container",
        "  images    List images",
        "  logs      Fetch the logs of a container",
        "  pull      Pull an image or a repository from a registry",
        "  ps        List containers",
        "  rm        Remove one or more containers",
        "  run       Run a command in a new container",
        "  start     Start one or more stopped containers",
        "  stop      Stop one or more running containers",
        "",
        "Options:",
        "  -H, --host string        Daemon socket(s) to connect to",
        "  --help                   Print usage",
        "",
        "Run 'docker COMMAND --help' for more information on a command.",
    ];
}

function commandHelpOutput(sub: string): string[] | null {
    switch (sub) {
        case "pull":
            return [
                "Usage: docker pull [OPTIONS] NAME[:TAG]",
                "",
                "Options:",
                "  --all-tags              Download all tagged images",
                "  --platform string       Set platform if server is multi-platform",
                "  --quiet                 Suppress verbose output",
            ];
        case "images":
            return ["Usage: docker images [OPTIONS]"];
        case "run":
            return [
                "Usage: docker run [OPTIONS] IMAGE [COMMAND] [ARG...]",
                "",
                "Options:",
                "  -d, --detach            Run container in background",
                "  -e, --env list          Set environment variables",
                "  -p, --publish list      Publish a container's port(s) to the host",
                "  --name string           Assign a name to the container",
                "  -v, --volume list       Bind mount a volume",
            ];
        case "ps":
            return ["Usage: docker ps [OPTIONS]"];
        case "stop":
            return ["Usage: docker stop [OPTIONS] CONTAINER [CONTAINER...]"];
        case "start":
            return ["Usage: docker start [OPTIONS] CONTAINER [CONTAINER...]"];
        case "rm":
            return ["Usage: docker rm [OPTIONS] CONTAINER [CONTAINER...]"];
        case "logs":
            return ["Usage: docker logs [OPTIONS] CONTAINER"];
        case "exec":
            return ["Usage: docker exec -it CONTAINER COMMAND [ARG...]"];
        case "build":
            return [
                "Usage: docker build [OPTIONS] PATH | URL | -",
                "",
                "Options:",
                "  -f, --file string       Name of the Dockerfile",
                "  -t, --tag list          Name and optionally a tag in the 'name:tag' format",
                "  --target string         Set the target build stage",
                "  --no-cache              Do not use cache when building",
            ];
        case "compose":
            return [
                "Usage: docker compose [OPTIONS] COMMAND",
                "",
                "Commands:",
                "  up        Create and start containers",
                "  down      Stop and remove containers",
                "  ps        List containers",
                "  logs      View output from containers",
                "",
                "Options:",
                "  -f, --file string       Specify an alternate compose file",
                "  -p, --project-name      Project name",
            ];
        case "compose up":
            return ["Usage: docker compose up [OPTIONS]"];
        case "compose down":
            return ["Usage: docker compose down [OPTIONS]"];
        case "compose ps":
            return ["Usage: docker compose ps [OPTIONS]"];
        case "compose logs":
            return ["Usage: docker compose logs [OPTIONS]"];
        default:
            return null;
    }
}

export function evaluateCommand(
    ctx: EngineContext,
    cmd: ParsedCommand,
    workspace?: WorkspaceSnapshot,
): CommandResult {
    if (cmd.command !== "docker") {
        return {
            context: {},
            events: [],
            output: [`${cmd.command}: command not found`],
        };
    }

    const sub = cmd.subcommand ?? "";
    const wantsHelp = Boolean(
        cmd.flags.help || cmd.flags.h || sub === "--help" || sub === "-h",
    );
    if (wantsHelp && !sub) {
        return { context: {}, events: [], output: dockerHelpOutput() };
    }
    if (wantsHelp) {
        const help = commandHelpOutput(sub) ?? dockerHelpOutput();
        return { context: {}, events: [], output: help };
    }
    const dockerfileContent = workspace?.["Dockerfile"]?.content;
    const composeContent =
        workspace?.["compose.yml"]?.content ??
        workspace?.["docker-compose.yml"]?.content;

    switch (sub) {
        case "pull":
            return handlePull(ctx, cmd);
        case "images":
            return handleImages(ctx);
        case "run":
            return handleRun(ctx, cmd);
        case "ps":
            return handlePs(ctx, cmd);
        case "stop":
            return handleStop(ctx, cmd);
        case "start":
            return handleStart(ctx, cmd);
        case "rm":
            return handleRm(ctx, cmd);
        case "logs":
            return handleLogs(ctx, cmd);
        case "exec":
            return handleExec(ctx, cmd);
        case "build":
            return handleBuild(ctx, cmd, dockerfileContent);
        case "compose up":
            return handleComposeUp(ctx, cmd, composeContent);
        case "compose down":
            return handleComposeDown(ctx);
        case "compose ps":
            return handleComposePs(ctx);
        case "compose logs":
            return handleComposeLogs(ctx, cmd);
        default:
            return {
                context: {},
                events: [],
                output: [
                    `docker: '${sub}' is not a docker command. See 'docker --help'.`,
                    ``,
                    ...dockerHelpOutput(),
                ],
            };
    }
}
