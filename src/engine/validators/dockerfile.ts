import type { Diagnostic } from "../types";
import { parseDockerfileLines } from "./dockerfile/parser";
import {
    checkFromPresence,
    checkUnknownInstruction,
    checkCopyAddArgs,
    checkExecForm,
    checkEnvFormat,
    checkExposePort,
    checkWorkdirPath,
    checkFromTag,
    checkRunCount,
    checkAddOverCopy,
    checkAptGetClean,
    checkCmdEntrypointShellForm,
    checkMissingExpose,
} from "./dockerfile/rules";

export function validateDockerfile(content: string): Diagnostic[] {
    const lines = parseDockerfileLines(content);
    if (lines.length === 0) return [];

    const diagnostics: Diagnostic[] = [];

    diagnostics.push(...checkFromPresence(lines));

    let cmdCount = 0;
    let entrypointCount = 0;
    let cmdIsShell = false;
    let entrypointIsShell = false;
    let hasExpose = false;
    const runLineNumbers: number[] = [];

    for (const line of lines) {
        const unknown = checkUnknownInstruction(line);
        if (unknown) { diagnostics.push(unknown); continue; }

        switch (line.instruction) {
            case "COPY":
            case "ADD": {
                const argErr = checkCopyAddArgs(line);
                if (argErr) diagnostics.push(argErr);
                if (line.instruction === "ADD") {
                    const addWarn = checkAddOverCopy(line);
                    if (addWarn) diagnostics.push(addWarn);
                }
                break;
            }
            case "CMD": {
                cmdCount++;
                const execErr = checkExecForm(line);
                if (execErr) diagnostics.push(execErr);
                cmdIsShell = !line.rest.trim().startsWith("[");
                break;
            }
            case "ENTRYPOINT": {
                entrypointCount++;
                const execErr = checkExecForm(line);
                if (execErr) diagnostics.push(execErr);
                entrypointIsShell = !line.rest.trim().startsWith("[");
                break;
            }
            case "ENV": {
                const envErr = checkEnvFormat(line);
                if (envErr) diagnostics.push(envErr);
                break;
            }
            case "EXPOSE": {
                hasExpose = true;
                const portErr = checkExposePort(line);
                if (portErr) diagnostics.push(portErr);
                break;
            }
            case "WORKDIR": {
                const wdErr = checkWorkdirPath(line);
                if (wdErr) diagnostics.push(wdErr);
                break;
            }
            case "FROM": {
                const tagWarn = checkFromTag(line);
                if (tagWarn) diagnostics.push(tagWarn);
                break;
            }
            case "RUN": {
                runLineNumbers.push(line.lineNumber);
                const aptWarn = checkAptGetClean(line);
                if (aptWarn) diagnostics.push(aptWarn);
                break;
            }
        }
    }

    const runWarn = checkRunCount(runLineNumbers);
    if (runWarn) diagnostics.push(runWarn);

    const shellFormWarn = checkCmdEntrypointShellForm(
        cmdIsShell,
        entrypointIsShell,
        cmdCount > 0 && entrypointCount > 0,
        lines[lines.length - 1]
    );
    if (shellFormWarn) diagnostics.push(shellFormWarn);

    const cmdLines = lines.filter((l) => l.instruction === "CMD");
    const exposeWarn = checkMissingExpose(hasExpose, cmdLines);
    if (exposeWarn) diagnostics.push(exposeWarn);

    return diagnostics;
}
