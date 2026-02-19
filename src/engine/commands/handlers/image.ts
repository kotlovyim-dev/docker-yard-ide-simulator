import { EngineContext, ImageRecord, ParsedCommand, Diagnostic } from "../../types";
import { CommandResult, createEvent, fakeDigest, fakeId, formatSize, padEnd, resolveImage } from "../utils";
import { validateDockerfile } from "../../validators/dockerfile";

export function handlePull(ctx: EngineContext, cmd: ParsedCommand): CommandResult {
    if (cmd.args.length === 0) {
        return { context: {}, events: [], output: ["Usage: docker pull <image[:tag]>"] };
    }

    const imageTag = cmd.args[0];
    const [repo, tag] = imageTag.split(":");
    const finalTag = tag ?? "latest";
    const fullName = `${repo}:${finalTag}`;

    const existing = ctx.images[fullName];
    if (existing) {
        return {
            context: {},
            events: [],
            output: [
                `${finalTag}: Pulling from library/${repo}`,
                `Digest: ${existing.id}`,
                `Status: Image is up to date for ${fullName}`,
            ],
        };
    }

    const digest = fakeDigest();
    const layers = [fakeId(), fakeId(), fakeId()];
    const newImage: ImageRecord = {
        id: digest,
        repository: repo,
        tag: finalTag,
        size: Math.floor(Math.random() * 200_000_000) + 10_000_000,
        createdAt: new Date().toISOString(),
        layers,
    };

    const events = [
        createEvent("IMAGE_PULL_STARTED", { repository: repo, tag: finalTag }, `Started pulling image ${fullName}`),
        createEvent("IMAGE_PULL_COMPLETE", { image: newImage }, `Pulled image ${fullName}`),
    ];

    return {
        context: { images: { ...ctx.images, [fullName]: newImage } },
        events,
        output: [
            `Using default tag: ${finalTag}`,
            `${finalTag}: Pulling from library/${repo}`,
            ...layers.map((l) => `${l.substring(0, 12)}: Pull complete`),
            `Digest: ${digest}`,
            `Status: Downloaded newer image for ${fullName}`,
        ],
    };
}

export function handleImages(ctx: EngineContext): CommandResult {
    const header =
        padEnd("REPOSITORY", 20) +
        padEnd("TAG", 12) +
        padEnd("IMAGE ID", 14) +
        padEnd("CREATED", 22) +
        "SIZE";

    const rows = Object.values(ctx.images).map((img) => {
        const id = img.id.replace("sha256:", "").substring(0, 12);
        return (
            padEnd(img.repository, 20) +
            padEnd(img.tag, 12) +
            padEnd(id, 14) +
            padEnd(img.createdAt.substring(0, 19).replace("T", " "), 22) +
            formatSize(img.size)
        );
    });

    return { context: {}, events: [], output: [header, ...rows] };
}

export function handleBuild(
    ctx: EngineContext,
    cmd: ParsedCommand,
    dockerfileContent?: string
): CommandResult {
    const tagFlag = cmd.flags["t"] ?? cmd.flags["tag"];
    const tag = typeof tagFlag === "string" ? tagFlag : "unnamed:latest";
    const [repo, version] = tag.includes(":") ? tag.split(":") : [tag, "latest"];
    const fullTag = `${repo}:${version}`;

    if (dockerfileContent !== undefined) {
        const diagnostics = validateDockerfile(dockerfileContent);
        const errors = diagnostics.filter((d: Diagnostic) => d.severity === "error");
        const warnings = diagnostics.filter((d: Diagnostic) => d.severity === "warning");

        const advisoryLines = warnings.map((w: Diagnostic) => `WARNING: [${w.ruleId}] ${w.message}`);

        if (errors.length > 0) {
            const errorLines = errors.flatMap((e: Diagnostic, i: number) => [
                `#${i + 1} ERROR [${e.ruleId}] ${e.message}`,
                `    line ${e.line}: ${e.explanation}`,
            ]);
            return {
                context: {},
                events: [createEvent("BUILD_FAILED", { tag: fullTag, errors }, `Build failed for ${fullTag}`)],
                output: [...advisoryLines, ...errorLines, ``, `failed to solve: Dockerfile validation failed.`],
            };
        }

        if (advisoryLines.length > 0) {
            advisoryLines.push("");
        }
    }

    const builtImage: ImageRecord = {
        id: fakeDigest(),
        repository: repo,
        tag: version,
        size: Math.floor(Math.random() * 150_000_000) + 20_000_000,
        createdAt: new Date().toISOString(),
        layers: [fakeId(), fakeId(), fakeId(), fakeId()],
    };
    const shortId = builtImage.id.replace("sha256:", "").substring(0, 12);

    return {
        context: { images: { ...ctx.images, [fullTag]: builtImage } },
        events: [
            createEvent("BUILD_STEP", { tag: fullTag }, `Build step executed for ${fullTag}`),
            createEvent("BUILD_COMPLETE", { image: builtImage }, `Built image ${fullTag} successfully`),
        ],
        output: [
            "Step 1/4 : FROM node:18-alpine",
            " ---> Using cache",
            "Step 2/4 : WORKDIR /app",
            ` ---> Running in ${fakeId()}`,
            "Step 3/4 : COPY package.json .",
            ` ---> ${fakeId()}`,
            "Step 4/4 : RUN npm install",
            ` ---> Running in ${fakeId()}`,
            ` ---> ${fakeId()}`,
            `Successfully built ${shortId}`,
            `Successfully tagged ${fullTag}`,
        ],
    };
}
