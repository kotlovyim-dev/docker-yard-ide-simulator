import type { Diagnostic } from "../types";
import { diag } from "./utils";
import { parseYaml, asDoc } from "./yaml";
import {
    checkServicesKey,
    checkImageOrBuild,
    checkBuildContext,
    checkPorts,
    checkDependsOn,
    checkVolumeMounts,
    checkNetworks,
    checkImageTag,
    checkRestartPolicy,
    checkEnvironment,
} from "./compose/rules";

export function validateCompose(content: string, workspacePaths: string[] = []): Diagnostic[] {
    const { doc, error } = parseYaml(content);

    if (error) {
        return [diag(
            "DC-YAML", "error", error.line,
            `YAML parse error: ${error.message}`,
            "The compose file could not be parsed as valid YAML. Check for unclosed brackets, bad indentation, or duplicate keys."
        )];
    }

    if (!doc) return [];

    const missingServices = checkServicesKey(doc);
    if (missingServices.length > 0) return missingServices;

    const services = asDoc(doc["services"]);
    if (!services) return [];

    const topVolumes = asDoc(doc["volumes"]) ?? {};
    const topNetworks = asDoc(doc["networks"]) ?? {};
    const serviceNames = Object.keys(services);
    const diagnostics: Diagnostic[] = [];

    for (const [svcName, svcVal] of Object.entries(services)) {
        const svc = asDoc(svcVal);
        if (!svc) continue;

        const ctx = { svcName, svc, serviceNames, topVolumes, topNetworks, workspacePaths };

        const imageOrBuild = checkImageOrBuild(ctx);
        if (imageOrBuild) diagnostics.push(imageOrBuild);

        const buildCtx = checkBuildContext(ctx);
        if (buildCtx) diagnostics.push(buildCtx);

        diagnostics.push(
            ...checkPorts(ctx),
            ...checkDependsOn(ctx),
            ...checkVolumeMounts(ctx),
            ...checkNetworks(ctx),
            ...checkImageTag(ctx),
            ...checkEnvironment(ctx),
        );

        const restartWarn = checkRestartPolicy(ctx);
        if (restartWarn) diagnostics.push(restartWarn);
    }

    return diagnostics;
}
