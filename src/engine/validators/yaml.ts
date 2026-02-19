// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YamlValue = string | number | boolean | null | YamlValue[] | Record<string, unknown>;
export type YamlDoc = Record<string, YamlValue>;

export function asDoc(val: YamlValue): YamlDoc | null {
    if (val && typeof val === "object" && !Array.isArray(val)) return val as YamlDoc;
    return null;
}

export function asString(val: YamlValue): string | null {
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
    return null;
}

export function asArray(val: YamlValue): YamlValue[] | null {
    return Array.isArray(val) ? val : null;
}

function parseScalar(value: string): YamlValue {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null" || value === "~") return null;
    const num = Number(value);
    if (!isNaN(num) && value !== "") return num;
    return value.replace(/^["']|["']$/g, "");
}

export function parseYaml(content: string): { doc: YamlDoc | null; error: { line: number; message: string } | null } {
    try {
        const lines = content.split("\n");
        const doc: YamlDoc = {};
        const stack: Array<{ indent: number; obj: YamlDoc | YamlValue[] }> = [{ indent: -1, obj: doc }];
        let lastKey: string | null = null;
        let lineNumber = 0;

        for (const rawLine of lines) {
            lineNumber++;
            const line = rawLine.replace(/\r$/, "");
            const trimmed = line.trimStart();
            if (trimmed === "" || trimmed.startsWith("#")) continue;

            const indent = line.length - trimmed.length;

            if (trimmed.startsWith("- ")) {
                while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
                const parent = stack[stack.length - 1].obj;
                const value = trimmed.slice(2).trim();
                if (Array.isArray(parent)) {
                    parent.push(parseScalar(value));
                } else if (lastKey && typeof parent === "object") {
                    const existing = (parent as YamlDoc)[lastKey];
                    if (!Array.isArray(existing)) (parent as YamlDoc)[lastKey] = [];
                    ((parent as YamlDoc)[lastKey] as YamlValue[]).push(parseScalar(value));
                }
                continue;
            }

            const colonIdx = trimmed.indexOf(":");
            if (colonIdx === -1) continue;

            const key = trimmed.slice(0, colonIdx).trim();
            const rest = trimmed.slice(colonIdx + 1).trim();

            while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
            const parent = stack[stack.length - 1].obj as YamlDoc;

            if (rest === "" || rest === "|" || rest === ">") {
                const nested: YamlDoc = {};
                parent[key] = nested;
                stack.push({ indent, obj: nested });
                lastKey = key;
            } else {
                parent[key] = parseScalar(rest);
                lastKey = key;
            }
        }

        return { doc, error: null };
    } catch (e) {
        return { doc: null, error: { line: 1, message: String(e) } };
    }
}
