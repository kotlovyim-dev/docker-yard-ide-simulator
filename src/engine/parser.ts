import type { ParsedCommand } from "./types";

const TOKEN_RE = /(?:"([^"]*)")|(?:'([^']*)')|(\S+)/g;

function tokenize(raw: string): string[] {
    const tokens: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = TOKEN_RE.exec(raw)) !== null) {
        tokens.push(match[1] ?? match[2] ?? match[3]);
    }
    TOKEN_RE.lastIndex = 0;
    return tokens;
}

const LONG_FLAG_VALUE_RE = /^--([^=]+)=(.+)$/;
const LONG_FLAG_BARE_RE = /^--(.+)$/;
const SHORT_FLAG_RE = /^-([^-].*)$/;

const VALUE_FLAGS: Record<string, Set<string>> = {
    "run": new Set(["p", "e", "v", "name", "net", "network", "h", "hostname", "u", "user", "w", "workdir"]),
    "exec": new Set(["e", "u", "w", "workdir"]),
    "build": new Set(["t", "tag", "f", "file", "target"]),
    "compose": new Set(["f", "file", "p", "project-name"]),
    "global": new Set(["H", "host", "c", "context"]),
};

export function parseCommand(raw: string): ParsedCommand {
    const tokens = tokenize(raw.trim());

    if (tokens.length === 0) {
        return { raw, command: "", subcommand: null, args: [], flags: {} };
    }

    let cursor = 0;
    let command = "docker";
    let subcommand: string | null = null;

    if (tokens[cursor] === "docker") {
        cursor++;

        if (cursor < tokens.length) {
            const initialCmd = tokens[cursor++];
            subcommand = initialCmd;

            if (initialCmd === "compose" && cursor < tokens.length && !tokens[cursor].startsWith("-")) {
                subcommand = `${initialCmd} ${tokens[cursor++]}`;
            }
        }
    } else {
        command = tokens[cursor++];
    }

    const args: string[] = [];
    const flags: Record<string, string | boolean> = {};

    let contextFlags = new Set<string>();

    const cmdBase = subcommand?.split(" ")[0];
    if (cmdBase && VALUE_FLAGS[cmdBase]) {
        contextFlags = VALUE_FLAGS[cmdBase];
    }

    let stopFlags = false;

    while (cursor < tokens.length) {
        const token = tokens[cursor];

        if (stopFlags) {
            args.push(token);
            cursor++;
            continue;
        }

        let m: RegExpExecArray | null;

        if ((m = LONG_FLAG_VALUE_RE.exec(token))) {
            flags[m[1]] = m[2];
            cursor++;
        } else if ((m = LONG_FLAG_BARE_RE.exec(token))) {
            const key = m[1];
            if (contextFlags.has(key) || VALUE_FLAGS["global"].has(key)) {
                const next = tokens[cursor + 1];
                if (next !== undefined && !next.startsWith("-")) {
                    flags[key] = next;
                    cursor += 2;
                } else {
                    flags[key] = true;
                    cursor++;
                }
            } else {
                flags[key] = true;
                cursor++;
            }
        } else if ((m = SHORT_FLAG_RE.exec(token))) {
            const chars = m[1];

            if (chars.length > 1) {
                for (const c of chars) {
                    flags[c] = true;
                }
                cursor++;
            } else {
                const key = chars;
                if (contextFlags.has(key) || VALUE_FLAGS["global"].has(key)) {
                    const next = tokens[cursor + 1];
                    if (next !== undefined && !next.startsWith("-")) {
                        flags[key] = next;
                        cursor += 2;
                    } else {
                        flags[key] = true;
                        cursor++;
                    }
                } else {
                    flags[key] = true;
                    cursor++;
                }
            }
        } else {
            stopFlags = true;
            args.push(token);
            cursor++;
        }
    }

    return { raw, command, subcommand, args, flags };
}
