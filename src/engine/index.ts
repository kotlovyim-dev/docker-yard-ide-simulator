export * from "./types";
export * from "./parser";
export * from "./validators/dockerfile";
export * from "./validators/compose";

import type { Diagnostic } from "./types";
import { validateDockerfile } from "./validators/dockerfile";
import { validateCompose } from "./validators/compose";

export function validate(
    fileType: "dockerfile" | "yaml",
    content: string,
    workspacePaths?: string[]
): Diagnostic[] {
    if (fileType === "dockerfile") return validateDockerfile(content);
    if (fileType === "yaml") return validateCompose(content, workspacePaths);
    return [];
}
