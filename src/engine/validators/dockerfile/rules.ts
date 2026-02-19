import type { Diagnostic } from "../../types";
import { diag } from "../utils";
import { ParsedLine, KNOWN_INSTRUCTIONS, tryParseJsonArray } from "./parser";

export function checkFromPresence(lines: ParsedLine[]): Diagnostic[] {
    const nonArgLines = lines.filter((l) => l.instruction !== "ARG");
    const firstNonArg = nonArgLines[0];
    if (!firstNonArg || firstNonArg.instruction === "FROM") return [];

    if (!lines.some((l) => l.instruction === "FROM")) {
        return [diag(
            "DF-E-001", "error", lines[0].lineNumber,
            "Dockerfile must begin with a FROM instruction",
            "Every Dockerfile must start with FROM to set the base image. Without it Docker cannot construct a build context.",
            "Add `FROM <image>` as the first instruction."
        )];
    }

    return [diag(
        "DF-E-002", "error", firstNonArg.lineNumber,
        "FROM must be the first non-ARG instruction",
        "ARG is the only instruction allowed before FROM. All others (RUN, COPY, LABEL, etc.) must come after the base image is declared.",
        "Move the FROM instruction above all non-ARG instructions."
    )];
}

export function checkUnknownInstruction(line: ParsedLine): Diagnostic | null {
    if (KNOWN_INSTRUCTIONS.has(line.instruction)) return null;
    return diag(
        "DF-E-003", "error", line.lineNumber,
        `Unknown instruction: ${line.instruction}`,
        `'${line.instruction}' is not a valid Dockerfile instruction. Check for typos — common ones include COPPY, FRROM, RRUN.`,
        "Did you mean one of: COPY, FROM, RUN?"
    );
}

export function checkCopyAddArgs(line: ParsedLine): Diagnostic | null {
    const tokens = line.rest.split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) return null;
    return diag(
        "DF-E-004", "error", line.lineNumber,
        `${line.instruction} requires at least two arguments: <src> <dest>`,
        `${line.instruction} needs a source path and a destination path. A single argument is ambiguous and will fail at build time.`,
        "Example: `COPY . /app`"
    );
}

export function checkExecForm(line: ParsedLine): Diagnostic | null {
    const isExec = line.rest.trim().startsWith("[");
    if (!isExec || tryParseJsonArray(line.rest)) return null;
    return diag(
        "DF-E-005", "error", line.lineNumber,
        "Invalid exec form: must be a proper JSON array",
        `${line.instruction} exec form must be a valid JSON array of strings, e.g. ["npm","start"]. Mixing shell and exec tokens causes a parse error.`,
        `Use either shell form or exec form \`["executable","param"]\`.`
    );
}

export function checkEnvFormat(line: ParsedLine): Diagnostic | null {
    if (line.rest.includes("=")) return null;
    return diag(
        "DF-E-006", "error", line.lineNumber,
        "ENV instruction requires KEY=VALUE format",
        "The modern ENV syntax requires `KEY=VALUE`. The legacy `ENV KEY VALUE` form only allows setting one variable and is deprecated.",
        `Change to \`ENV ${line.rest}=<value>\``
    );
}

export function checkExposePort(line: ParsedLine): Diagnostic | null {
    const port = line.rest.split("/")[0].trim();
    if (/^\d+$/.test(port)) return null;
    return diag(
        "DF-E-007", "error", line.lineNumber,
        "EXPOSE argument must be a valid port number",
        `'${port}' is not a valid port number. EXPOSE accepts integers in the range 1–65535, optionally followed by /tcp or /udp.`,
        "Example: `EXPOSE 8080` or `EXPOSE 80/tcp`"
    );
}

export function checkWorkdirPath(line: ParsedLine): Diagnostic | null {
    if (!line.rest.startsWith("..") && !line.rest.includes("/../")) return null;
    return diag(
        "DF-E-008", "error", line.lineNumber,
        "WORKDIR must be an absolute path or a valid relative path within the image",
        "A WORKDIR path that starts with `..` could escape the intended directory boundary. Use an absolute path like `/app` for clarity.",
        "Change to an absolute path, e.g. `WORKDIR /app`"
    );
}

export function checkFromTag(line: ParsedLine): Diagnostic | null {
    const tag = line.rest.includes(":") ? line.rest.split(":")[1]?.split(" ")[0] : "latest";
    if (tag && tag !== "latest") return null;
    return diag(
        "DF-W-001", "warning", line.lineNumber,
        "Avoid using :latest; pin a specific version for reproducibility",
        "The :latest tag resolves to whatever the registry considers current at build time. Pinning (e.g. `node:18.20-alpine`) guarantees identical builds across machines and time.",
        `Pin a version: \`FROM ${line.rest.split(":")[0]}:18-alpine\``
    );
}

export function checkRunCount(runLineNumbers: number[]): Diagnostic | null {
    if (runLineNumbers.length < 3) return null;
    return diag(
        "DF-W-002", "warning", runLineNumbers[runLineNumbers.length - 1],
        "Consider combining RUN instructions with && to reduce image layers",
        "Each RUN instruction creates a new image layer. Combining them with && keeps the image smaller and the layer count lower.",
        "Merge: `RUN apt-get update && apt-get install ...`"
    );
}

export function checkAddOverCopy(line: ParsedLine): Diagnostic | null {
    if (line.rest.startsWith("http") || /\.tar\./.test(line.rest)) return null;
    return diag(
        "DF-W-003", "warning", line.lineNumber,
        "Prefer COPY over ADD for local file copies; ADD has implicit tar extraction behavior",
        "ADD automatically extracts tar archives and can fetch remote URLs, which makes builds less predictable. COPY is explicit and safer for local files.",
        `Replace \`ADD ${line.rest}\` with \`COPY ${line.rest}\``
    );
}

export function checkAptGetClean(line: ParsedLine): Diagnostic | null {
    if (!/apt-get install/.test(line.rest)) return null;
    if (line.rest.includes("--no-install-recommends") || line.rest.includes("apt-get clean")) return null;
    return diag(
        "DF-W-005", "warning", line.lineNumber,
        "Consider --no-install-recommends and cleaning apt cache to reduce layer size",
        "Without --no-install-recommends, apt installs suggested packages bloating the layer. Without apt-get clean the package cache remains in the image.",
        "Append `--no-install-recommends && rm -rf /var/lib/apt/lists/*`"
    );
}

export function checkCmdEntrypointShellForm(
    cmdIsShell: boolean,
    entrypointIsShell: boolean,
    hasBoth: boolean,
    lastLine: ParsedLine
): Diagnostic | null {
    if (!hasBoth || !cmdIsShell || !entrypointIsShell) return null;
    return diag(
        "DF-W-006", "warning", lastLine.lineNumber,
        "When combining CMD and ENTRYPOINT, prefer exec form (JSON array) for both",
        "When both CMD and ENTRYPOINT are in shell form, CMD arguments are not passed to ENTRYPOINT as expected. Exec form ensures proper signal propagation and argument passing.",
        'Use exec form: `ENTRYPOINT ["executable"]` and `CMD ["param"]`'
    );
}

const PORT_LISTENING_IMAGES = ["nginx", "node", "apache", "httpd", "python", "flask", "express", "rails"];

export function checkMissingExpose(hasExpose: boolean, cmdLines: ParsedLine[]): Diagnostic | null {
    if (hasExpose || cmdLines.length === 0) return null;
    const lastCmd = cmdLines[cmdLines.length - 1];
    if (!PORT_LISTENING_IMAGES.some((img) => lastCmd.rest.toLowerCase().includes(img))) return null;
    return diag(
        "DF-W-007", "warning", lastCmd.lineNumber,
        "Consider adding EXPOSE to document the port your service listens on",
        "EXPOSE is a documentation hint telling consumers which port the service binds. It does not publish the port but makes the Dockerfile self-describing.",
        "Add `EXPOSE 80` (or the appropriate port) before CMD."
    );
}
