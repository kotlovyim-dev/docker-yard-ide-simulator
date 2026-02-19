import type { ParsedCommand } from "./types";

export function parseCommand(raw: string): ParsedCommand {
    return {
        raw,
        command: "",
        subcommand: null,
        args: [],
        flags: {},
    };
}
