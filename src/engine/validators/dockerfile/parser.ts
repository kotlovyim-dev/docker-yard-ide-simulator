export type ParsedLine = {
    lineNumber: number;
    raw: string;
    instruction: string;
    rest: string;
};

export const KNOWN_INSTRUCTIONS = new Set([
    "FROM", "RUN", "CMD", "LABEL", "EXPOSE", "ENV", "ADD", "COPY",
    "ENTRYPOINT", "VOLUME", "USER", "WORKDIR", "ARG", "ONBUILD",
    "STOPSIGNAL", "HEALTHCHECK", "SHELL",
]);

export function tryParseJsonArray(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed.startsWith("[")) return true;
    try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) && parsed.every((v) => typeof v === "string");
    } catch {
        return false;
    }
}

export function parseDockerfileLines(content: string): ParsedLine[] {
    const result: ParsedLine[] = [];
    const rawLines = content.split("\n");
    let continued = "";
    let continuedStart = 0;

    for (let i = 0; i < rawLines.length; i++) {
        const lineNumber = i + 1;
        const line = rawLines[i];
        const trimmed = line.trimStart();

        if (trimmed.startsWith("#") || trimmed === "") continue;

        if (continued) {
            if (line.trimEnd().endsWith("\\")) {
                continued += " " + trimmed.slice(0, -1).trim();
            } else {
                continued += " " + trimmed;
                const parts = continued.match(/^(\S+)\s*([\s\S]*)$/) ?? [];
                result.push({
                    lineNumber: continuedStart,
                    raw: continued,
                    instruction: (parts[1] ?? "").toUpperCase(),
                    rest: (parts[2] ?? "").trim(),
                });
                continued = "";
            }
            continue;
        }

        if (line.trimEnd().endsWith("\\")) {
            continued = trimmed.slice(0, -1).trim();
            continuedStart = lineNumber;
            continue;
        }

        const parts = trimmed.match(/^(\S+)\s*([\s\S]*)$/) ?? [];
        result.push({
            lineNumber,
            raw: trimmed,
            instruction: (parts[1] ?? "").toUpperCase(),
            rest: (parts[2] ?? "").trim(),
        });
    }

    return result;
}
