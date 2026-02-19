import { EngineContext, ParsedCommand } from "../types";
import { CommandResult } from "./utils";
import { handlePull, handleImages, handleBuild } from "./handlers/image";
import { handleRun, handlePs, handleStop, handleStart, handleRm } from "./handlers/container";
import { handleLogs, handleExec } from "./handlers/exec";
import { handleComposeUp, handleComposeDown, handleComposePs, handleComposeLogs } from "./handlers/compose";

export function evaluateCommand(ctx: EngineContext, cmd: ParsedCommand): CommandResult {
    if (cmd.command !== "docker") {
        return { context: {}, events: [], output: [`${cmd.command}: command not found`] };
    }

    const sub = cmd.subcommand ?? "";

    switch (sub) {
        case "pull": return handlePull(ctx, cmd);
        case "images": return handleImages(ctx);
        case "run": return handleRun(ctx, cmd);
        case "ps": return handlePs(ctx, cmd);
        case "stop": return handleStop(ctx, cmd);
        case "start": return handleStart(ctx, cmd);
        case "rm": return handleRm(ctx, cmd);
        case "logs": return handleLogs(ctx, cmd);
        case "exec": return handleExec(ctx, cmd);
        case "build": return handleBuild(ctx, cmd);
        case "compose up": return handleComposeUp(ctx, cmd);
        case "compose down": return handleComposeDown(ctx);
        case "compose ps": return handleComposePs(ctx);
        case "compose logs": return handleComposeLogs(ctx, cmd);
        default:
            return {
                context: {},
                events: [],
                output: [
                    `docker: '${sub}' is not a docker command. See 'docker --help'.`,
                    ``,
                    `Usage:  docker [OPTIONS] COMMAND`,
                    ``,
                    `Run 'docker COMMAND --help' for more information on a command.`,
                ],
            };
    }
}
