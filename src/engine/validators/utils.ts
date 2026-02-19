import type { Diagnostic } from "../types";

export function diag(
    ruleId: string,
    severity: "error" | "warning",
    line: number,
    message: string,
    explanation: string,
    fix?: string
): Diagnostic {
    return { ruleId, severity, line, col: 1, endLine: line, endCol: 999, message, explanation, fix };
}
