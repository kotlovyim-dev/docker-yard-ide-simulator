import { describe, it, expect } from "vitest";
import { evaluateCommand } from "../engine/commands/evaluator";
import { EngineContext, ParsedCommand } from "../engine/types";

const emptyContext: EngineContext = {
    images: {},
    containers: {},
    networks: {},
    volumes: {},
    composeStacks: {},
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

        expect(result.output.join("\n")).toContain(
            "Downloaded newer image for nginx:latest",
        );
        expect(result.events).toHaveLength(2);
        expect(result.events[0].type).toBe("IMAGE_PULL_STARTED");
        expect(result.events[1].type).toBe("IMAGE_PULL_COMPLETE");
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

        expect(result.output[0]).toContain(
            "Unable to find image 'nginx' locally",
        );
        expect(result.events).toHaveLength(0);
        expect(Object.keys(result.context)).toHaveLength(0);
    });

    it("should run a container if image exists", () => {
        const ctxWithImage: EngineContext = {
            ...emptyContext,
            images: {
                "nginx:latest": {
                    id: "sha256:123",
                    repository: "nginx",
                    tag: "latest",
                    size: 100,
                    createdAt: "moments ago",
                    layers: [],
                },
            },
        };

        const cmd: ParsedCommand = {
            raw: "docker run -d --name web nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { d: true, name: "web" },
        };

        const result = evaluateCommand(ctxWithImage, cmd);

        expect(result.events).toHaveLength(2);
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
            images: {
                "nginx:latest": {
                    id: "123",
                    repository: "nginx",
                    tag: "latest",
                    size: 0,
                    createdAt: "",
                    layers: [],
                },
            },
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
                    volumeMounts: [],
                },
            },
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
            images: {
                "nginx:latest": {
                    id: "123",
                    repository: "nginx",
                    tag: "latest",
                    size: 0,
                    createdAt: "",
                    layers: [],
                },
            },
            boundPorts: {
                "8080": "existing-id",
            },
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

const composeYml = `
services:
  web:
    image: nginx
    ports:
      - "8080:80"
  db:
    image: postgres
    depends_on:
      - web
`.trim();

const composeYmlWithBuild = `
services:
  app:
    build: .
    ports:
      - "3000:3000"
`.trim();

const ctxWithNginxAndPostgres: EngineContext = {
    ...emptyContext,
    images: {
        "nginx:latest": {
            id: "sha256:nginxabc",
            repository: "nginx",
            tag: "latest",
            size: 50_000_000,
            createdAt: "2024-01-01T00:00:00Z",
            layers: [],
        },
        "postgres:latest": {
            id: "sha256:pgabc",
            repository: "postgres",
            tag: "latest",
            size: 200_000_000,
            createdAt: "2024-01-01T00:00:00Z",
            layers: [],
        },
    },
};

describe("docker compose up", () => {
    it("rejects when compose.yml is absent", () => {
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const result = evaluateCommand(emptyContext, cmd, {});
        expect(result.output.join("\n")).toContain("no compose.yml found");
    });

    it("rejects when compose.yml has validation errors", () => {
        const badCompose = `
services:
  web:
    restart: always
`.trim();
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const result = evaluateCommand(emptyContext, cmd, {
            "compose.yml": {
                path: "compose.yml",
                content: badCompose,
                language: "yaml",
            },
        });
        expect(result.output.join("\n")).toContain("validation failed");
    });

    it("rejects when image is not pulled", () => {
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const result = evaluateCommand(emptyContext, cmd, {
            "compose.yml": {
                path: "compose.yml",
                content: composeYml,
                language: "yaml",
            },
        });
        expect(result.output.join("\n")).toContain("not found locally");
    });

    it("creates containers for each service in depends_on order (db after web)", () => {
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const result = evaluateCommand(ctxWithNginxAndPostgres, cmd, {
            "compose.yml": {
                path: "compose.yml",
                content: composeYml,
                language: "yaml",
            },
        });

        expect(result.events.length).toBe(2);
        expect(result.events[0].type).toBe("COMPOSE_SERVICE_STARTED");
        expect(result.events[0].payload.service).toBe("web");
        expect(result.events[1].payload.service).toBe("db");

        const newContainers = Object.values(result.context.containers ?? {});
        expect(newContainers).toHaveLength(2);
        expect(newContainers.every((c) => c.status === "running")).toBe(true);

        const stacks = result.context.composeStacks ?? {};
        expect(stacks["default"]).toBeDefined();
        expect(stacks["default"].serviceNames).toEqual(["web", "db"]);
    });

    it("port mapping is registered on web service", () => {
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const result = evaluateCommand(ctxWithNginxAndPostgres, cmd, {
            "compose.yml": {
                path: "compose.yml",
                content: composeYml,
                language: "yaml",
            },
        });

        const webContainer = Object.values(
            result.context.containers ?? {},
        ).find((c) => c.name === "web")!;
        expect(webContainer.ports).toHaveLength(1);
        expect(webContainer.ports[0].hostPort).toBe(8080);
        expect(webContainer.ports[0].containerPort).toBe(80);
        expect(result.context.boundPorts?.["8080"]).toBeDefined();
    });

    it("rejects compose up when port is already allocated", () => {
        const ctxWithPort: EngineContext = {
            ...ctxWithNginxAndPostgres,
            boundPorts: { "8080": "existing-container" },
        };
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const result = evaluateCommand(ctxWithPort, cmd, {
            "compose.yml": {
                path: "compose.yml",
                content: composeYml,
                language: "yaml",
            },
        });
        expect(result.output.join("\n")).toContain("port is already allocated");
    });

    it("skips already-running services on second up", () => {
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const ws = {
            "compose.yml": {
                path: "compose.yml",
                content: composeYml,
                language: "yaml" as const,
            },
        };
        const first = evaluateCommand(ctxWithNginxAndPostgres, cmd, ws);
        const ctxAfterFirst: EngineContext = {
            ...ctxWithNginxAndPostgres,
            containers: first.context.containers ?? {},
            boundPorts: first.context.boundPorts ?? {},
            composeStacks: first.context.composeStacks ?? {},
        };
        const second = evaluateCommand(ctxAfterFirst, cmd, ws);
        expect(second.events).toHaveLength(0);
        expect(second.output.join("\n")).toContain("Running");
    });

    it("rejects service with build when no built image exists", () => {
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const result = evaluateCommand(emptyContext, cmd, {
            "compose.yml": {
                path: "compose.yml",
                content: composeYmlWithBuild,
                language: "yaml",
            },
        });
        expect(result.output.join("\n")).toContain("no built image found");
    });
});

describe("docker compose down", () => {
    it("removes compose-managed containers and clears the stack", () => {
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const ws = {
            "compose.yml": {
                path: "compose.yml",
                content: composeYml,
                language: "yaml" as const,
            },
        };
        const upResult = evaluateCommand(ctxWithNginxAndPostgres, cmd, ws);
        const ctxAfterUp: EngineContext = {
            ...ctxWithNginxAndPostgres,
            containers: upResult.context.containers ?? {},
            boundPorts: upResult.context.boundPorts ?? {},
            composeStacks: upResult.context.composeStacks ?? {},
        };

        const downCmd: ParsedCommand = {
            raw: "docker compose down",
            command: "docker",
            subcommand: "compose down",
            args: [],
            flags: {},
        };
        const downResult = evaluateCommand(ctxAfterUp, downCmd);

        const remaining = Object.values(
            downResult.context.containers ?? {},
        ).filter((c) => c.status !== "removed");
        expect(remaining).toHaveLength(0);
        expect(downResult.context.composeStacks?.["default"]).toBeUndefined();
        expect(downResult.events[0].type).toBe("COMPOSE_SERVICE_STOPPED");
    });
});

describe("docker compose ps", () => {
    it("shows only compose-managed containers", () => {
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const ws = {
            "compose.yml": {
                path: "compose.yml",
                content: composeYml,
                language: "yaml" as const,
            },
        };
        const upResult = evaluateCommand(ctxWithNginxAndPostgres, cmd, ws);
        const ctxAfterUp: EngineContext = {
            ...ctxWithNginxAndPostgres,
            containers: upResult.context.containers ?? {},
            composeStacks: upResult.context.composeStacks ?? {},
        };

        const psCmd: ParsedCommand = {
            raw: "docker compose ps",
            command: "docker",
            subcommand: "compose ps",
            args: [],
            flags: {},
        };
        const psResult = evaluateCommand(ctxAfterUp, psCmd);

        expect(psResult.output).toHaveLength(3);
        expect(psResult.output[1]).toContain("web");
        expect(psResult.output[2]).toContain("db");
    });
});

describe("docker compose logs", () => {
    it("returns logs for each compose service", () => {
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const ws = {
            "compose.yml": {
                path: "compose.yml",
                content: composeYml,
                language: "yaml" as const,
            },
        };
        const upResult = evaluateCommand(ctxWithNginxAndPostgres, cmd, ws);
        const ctxAfterUp: EngineContext = {
            ...ctxWithNginxAndPostgres,
            containers: upResult.context.containers ?? {},
            composeStacks: upResult.context.composeStacks ?? {},
        };

        const logsCmd: ParsedCommand = {
            raw: "docker compose logs",
            command: "docker",
            subcommand: "compose logs",
            args: [],
            flags: {},
        };
        const logsResult = evaluateCommand(ctxAfterUp, logsCmd);
        const combined = logsResult.output.join("\n");
        expect(combined).toContain("web");
        expect(combined).toContain("db");
    });

    it("respects --tail flag", () => {
        const cmd: ParsedCommand = {
            raw: "docker compose up -d",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: { d: true },
        };
        const ws = {
            "compose.yml": {
                path: "compose.yml",
                content: composeYml,
                language: "yaml" as const,
            },
        };
        const upResult = evaluateCommand(ctxWithNginxAndPostgres, cmd, ws);
        const ctxAfterUp: EngineContext = {
            ...ctxWithNginxAndPostgres,
            containers: upResult.context.containers ?? {},
            composeStacks: upResult.context.composeStacks ?? {},
        };

        const logsCmd: ParsedCommand = {
            raw: "docker compose logs --tail 1",
            command: "docker",
            subcommand: "compose logs",
            args: [],
            flags: { tail: "1" },
        };
        const logsResult = evaluateCommand(ctxAfterUp, logsCmd);
        expect(logsResult.output).toHaveLength(2);
    });
});
