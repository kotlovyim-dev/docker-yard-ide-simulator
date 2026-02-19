import type { Diagnostic } from "../../types";
import { diag } from "../utils";
import { YamlDoc, asDoc, asString, asArray } from "../yaml";

const SECRET_PATTERN = /password|secret|passwd|token|api_key|private_key/i;
const DB_IMAGE_PATTERN = /postgres|mysql|mariadb|mongo/i;

type ServiceContext = {
    svcName: string;
    svc: YamlDoc;
    serviceNames: string[];
    topVolumes: YamlDoc;
    topNetworks: YamlDoc;
    workspacePaths: string[];
};

export function checkServicesKey(doc: YamlDoc): Diagnostic[] {
    if (doc["services"]) return [];
    return [diag(
        "DC-E-001", "error", 1,
        "compose.yml must define a top-level 'services' key",
        "Docker Compose files must have a top-level `services` map listing the containers to run. Without it compose up has nothing to start.",
        "Add `services:` at the top level with at least one service underneath."
    )];
}

export function checkImageOrBuild({ svcName, svc }: ServiceContext): Diagnostic | null {
    if ("image" in svc || "build" in svc) return null;
    return diag(
        "DC-E-002", "error", 1,
        `Service '${svcName}': must specify either 'image' or 'build'`,
        "Every service needs to know what container to run. Use `image` to reference a pre-built image, or `build` to build from a Dockerfile.",
        `Add \`image: nginx:stable\` or \`build: .\` under service '${svcName}'.`
    );
}

export function checkBuildContext({ svcName, svc, workspacePaths }: ServiceContext): Diagnostic | null {
    if (!("build" in svc)) return null;
    const buildVal = svc["build"];
    const buildPath = asString(buildVal) ?? asString(asDoc(buildVal)?.["context"] ?? null);
    if (!buildPath || buildPath === "." || workspacePaths.includes(buildPath)) return null;
    return diag(
        "DC-E-005", "error", 1,
        `Service '${svcName}': build context '${buildPath}' does not exist in workspace`,
        `The build context path '${buildPath}' was not found among workspace files. Compose cannot locate the Dockerfile.`,
        `Create the directory '${buildPath}' or correct the path.`
    );
}

export function checkPorts({ svcName, svc }: ServiceContext): Diagnostic[] {
    const portsVal = asArray(svc["ports"]);
    if (!portsVal) return [];
    const diagnostics: Diagnostic[] = [];

    for (const portEntry of portsVal) {
        const portStr = asString(portEntry);
        if (portStr === null && typeof portEntry !== "number") {
            diagnostics.push(diag(
                "DC-E-003", "error", 1,
                `Service '${svcName}': ports entries must be strings in 'host:container' format`,
                `Each ports entry must be a string like "8080:80" or a bare number. Objects and other types are not valid in this position.`,
                `Use string format: "8080:80"`
            ));
            continue;
        }
        const raw = portStr ?? String(portEntry);
        if (raw.includes(":")) {
            const [host, container] = raw.split(":");
            if (isNaN(parseInt(host, 10)) || isNaN(parseInt(container, 10))) {
                diagnostics.push(diag(
                    "DC-E-004", "error", 1,
                    `Service '${svcName}': invalid port mapping '${raw}'`,
                    "Both the host and container port in a port mapping must be numeric. Non-numeric values cause compose up to fail.",
                    `Correct the mapping to use integers, e.g. "8080:80".`
                ));
            }
        }
    }
    return diagnostics;
}

export function checkDependsOn({ svcName, svc, serviceNames }: ServiceContext): Diagnostic[] {
    const dependsOnVal = svc["depends_on"];
    if (!dependsOnVal) return [];

    const deps = Array.isArray(dependsOnVal)
        ? (dependsOnVal as unknown[]).map((d) => asString(d as never)).filter(Boolean) as string[]
        : Object.keys(asDoc(dependsOnVal as never) ?? {});

    return deps
        .filter((dep) => !serviceNames.includes(dep))
        .map((dep) => diag(
            "DC-E-006", "error", 1,
            `Service '${svcName}': depends_on references unknown service '${dep}'`,
            `'${dep}' is listed in depends_on but is not defined in the services map. Compose will refuse to start.`,
            `Add service '${dep}' to the services map or remove the dependency.`
        ));
}

export function checkVolumeMounts({ svcName, svc, topVolumes }: ServiceContext): Diagnostic[] {
    const volumesVal = asArray(svc["volumes"]);
    if (!volumesVal) return [];

    return volumesVal
        .map((v) => asString(v))
        .filter((vStr): vStr is string => vStr !== null)
        .filter((vStr) => {
            const volName = vStr.split(":")[0];
            return !volName.startsWith(".") && !volName.startsWith("/") && !(volName in topVolumes);
        })
        .map((vStr) => {
            const volName = vStr.split(":")[0];
            return diag(
                "DC-E-007", "error", 1,
                `Volume '${volName}' is used by service '${svcName}' but not declared under top-level 'volumes'`,
                "Named volumes referenced in service volume mounts must be declared at the top-level 'volumes' key so Compose knows to create them.",
                `Add \`${volName}:\` under the top-level \`volumes:\` key.`
            );
        });
}

export function checkNetworks({ svcName, svc, topNetworks }: ServiceContext): Diagnostic[] {
    const networksVal = asArray(svc["networks"]) ?? Object.keys(asDoc(svc["networks"] as never) ?? {});
    if (!Array.isArray(networksVal)) return [];

    return networksVal
        .map((n) => (typeof n === "string" ? n : String(n)))
        .filter((netName) => !(netName in topNetworks))
        .map((netName) => diag(
            "DC-E-008", "error", 1,
            `Network '${netName}' is used but not declared under top-level 'networks'`,
            "Networks named in a service must be declared at the top-level 'networks' key. Otherwise Compose doesn't know how to create them.",
            `Add \`${netName}:\` under the top-level \`networks:\` key.`
        ));
}

export function checkImageTag({ svcName, svc }: ServiceContext): Diagnostic[] {
    if (!("image" in svc)) return [];
    const imgStr = asString(svc["image"]);
    if (!imgStr) return [];

    const diagnostics: Diagnostic[] = [];
    const tag = imgStr.includes(":") ? imgStr.split(":")[1] : "latest";

    if (!tag || tag === "latest") {
        diagnostics.push(diag(
            "DC-W-001", "warning", 1,
            `Service '${svcName}': avoid image:latest; pin a version for reproducibility`,
            "The :latest tag resolves to whatever is current at pull time. Pinning a version guarantees the same image across deployments.",
            `Pin the image version, e.g. \`image: ${imgStr.split(":")[0]}:stable\``
        ));
    }
    if (DB_IMAGE_PATTERN.test(imgStr) && !svc["healthcheck"]) {
        diagnostics.push(diag(
            "DC-W-003", "warning", 1,
            `Service '${svcName}': consider adding a healthcheck so dependent services wait for readiness`,
            "Database services often take a moment to accept connections. A healthcheck lets depends_on: condition: service_healthy wait properly instead of racing.",
            "Add a `healthcheck:` block with a test command like `pg_isready`."
        ));
    }
    return diagnostics;
}

export function checkRestartPolicy({ svcName, svc }: ServiceContext): Diagnostic | null {
    if (svc["restart"]) return null;
    return diag(
        "DC-W-002", "warning", 1,
        `Service '${svcName}': consider adding a restart policy (e.g., unless-stopped)`,
        "Without a restart policy the container stays stopped after a crash or reboot. `unless-stopped` is a safe default for long-running services.",
        `Add \`restart: unless-stopped\` under service '${svcName}'.`
    );
}

export function checkEnvironment({ svcName, svc }: ServiceContext): Diagnostic[] {
    const envVal = svc["environment"];
    if (!envVal) return [];

    const diagnostics: Diagnostic[] = [];
    const isArr = Array.isArray(envVal);
    const isMap = !isArr && typeof envVal === "object" && envVal !== null;
    const entries: string[] = [];

    if (isArr) {
        for (const e of envVal as unknown[]) {
            const s = asString(e as never);
            if (s) entries.push(s);
        }
    } else if (isMap) {
        for (const [k, v] of Object.entries(envVal as YamlDoc)) {
            entries.push(`${k}=${asString(v) ?? ""}`);
        }
    }

    if (isArr && isMap) {
        diagnostics.push(diag(
            "DC-W-004", "warning", 1,
            `Service '${svcName}': mix of array and map environment syntax; prefer one form consistently`,
            "Using both array and map forms for the same service's environment is confusing and may cause unexpected merge behavior.",
            "Standardise on either the map form (`KEY: value`) or list form (`- KEY=value`)."
        ));
    }

    for (const entry of entries) {
        const [key, value = ""] = entry.split("=");
        if (SECRET_PATTERN.test(key) && value.length > 0) {
            diagnostics.push(diag(
                "DC-W-005", "warning", 1,
                `Service '${svcName}': plain-text secret detected in environment; prefer Docker secrets or .env files`,
                "Embedding passwords and tokens directly in compose.yml checks them into source control. Use a .env file or Docker secrets instead.",
                `Move the value to a \`.env\` file and reference it as \`\${${key}}\`.`
            ));
        }
    }

    return diagnostics;
}
