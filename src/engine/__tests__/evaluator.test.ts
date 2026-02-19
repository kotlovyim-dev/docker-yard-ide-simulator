import { describe, it, expect } from "vitest";
import { evaluateCommand } from "../commands/evaluator";
import { EngineContext, ParsedCommand } from "../types";

const emptyContext: EngineContext = {
    images: {},
    containers: {},
    networks: {},
    volumes: {},
    eventLog: [],
    boundPorts: {},
    pendingCommand: null,
    lastError: null,
};

describe("evaluateCommand", () => {
    it("should pull an image", () => {
        const cmd: ParsedCommand = {
            raw: "docker pull nginx",
            command: "docker",
            subcommand: "pull",
            args: ["nginx"],
            flags: {},
        };

        const result = evaluateCommand(emptyContext, cmd);

        expect(result.output.join("\n")).toContain("Downloaded newer image for nginx:latest");
        expect(result.events).toHaveLength(1);
        expect(result.events[0].type).toBe("IMAGE_PULL_COMPLETE");
        expect(result.context.images).toBeDefined();
        expect(result.context.images!["nginx:latest"]).toBeDefined();
    });

    it("should fail to run container if image is missing", () => {
        const cmd: ParsedCommand = {
            raw: "docker run nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: {},
        };

        const result = evaluateCommand(emptyContext, cmd);

        expect(result.output[0]).toContain("Unable to find image 'nginx' locally");
        expect(result.events).toHaveLength(0);
        expect(Object.keys(result.context)).toHaveLength(0);
    });

    it("should run a container if image exists", () => {
        // Setup context with image
        const ctxWithImage: EngineContext = {
            ...emptyContext,
            images: {
                "nginx:latest": {
                    id: "sha256:123",
                    repository: "nginx",
                    tag: "latest",
                    size: 100,
                    createdAt: "moments ago",
                    layers: []
                }
            }
        };

        const cmd: ParsedCommand = {
            raw: "docker run -d --name web nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { d: true, name: "web" },
        };

        const result = evaluateCommand(ctxWithImage, cmd);

        expect(result.events).toHaveLength(2); // CREATED, STARTED
        expect(result.events[0].type).toBe("CONTAINER_CREATED");
        expect(result.events[1].type).toBe("CONTAINER_STARTED");

        const containerId = result.output[0];
        expect(containerId).toBeTruthy();

        const containers = result.context.containers!;
        expect(Object.values(containers)[0].name).toBe("web");
    });

    it("should prevent duplicate container names", () => {
        const ctx: EngineContext = {
            ...emptyContext,
            images: { "nginx:latest": { id: "123", repository: "nginx", tag: "latest", size: 0, createdAt: "", layers: [] } },
            containers: {
                "existing-id": {
                    id: "existing-id",
                    name: "web",
                    imageId: "123",
                    status: "running",
                    ports: [],
                    env: {},
                    createdAt: "",
                    startedAt: "",
                    stoppedAt: null,
                    logs: [],
                    networkIds: [],
                    volumeMounts: []
                }
            }
        };

        const cmd: ParsedCommand = {
            raw: "docker run --name web nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { name: "web" },
        };

        const result = evaluateCommand(ctx, cmd);
        expect(result.output[0]).toContain("Conflict");
        expect(result.events).toHaveLength(0);
    });

    it("should prevent port conflicts", () => {
        const ctx: EngineContext = {
            ...emptyContext,
            images: { "nginx:latest": { id: "123", repository: "nginx", tag: "latest", size: 0, createdAt: "", layers: [] } },
            boundPorts: {
                "8080": "existing-id"
            }
        };

        const cmd: ParsedCommand = {
            raw: "docker run -p 8080:80 nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { p: ["8080:80"] },
        };

        const result = evaluateCommand(ctx, cmd);
        expect(result.output[0]).toContain("port is already allocated");
        expect(result.events).toHaveLength(0);
    });
});
