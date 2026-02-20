import type { Lesson, EngineContext } from "@/engine/types";

function hasImage(ctx: EngineContext, ref: string): boolean {
    return Boolean(ctx.images[ref]);
}

function hasRunningContainerByImage(
    ctx: EngineContext,
    imageRef: string,
): boolean {
    const img = ctx.images[imageRef];
    if (!img) return false;
    return Object.values(ctx.containers).some(
        (c) => c.status === "running" && c.imageId === img.id,
    );
}

function hasRunningContainerByName(ctx: EngineContext, name: string): boolean {
    return Object.values(ctx.containers).some(
        (c) => c.status === "running" && c.name === name,
    );
}

function hasComposeStack(ctx: EngineContext, services: string[]): boolean {
    const stack = ctx.composeStacks?.["default"];
    if (!stack) return false;
    return services.every((s) => stack.serviceNames.includes(s));
}

const lesson1: Lesson = {
    id: "lesson-01-pull-run",
    title: "Pull and Run a Container",
    description:
        "Pull the nginx image and run it as a detached container. Use docker pull nginx, then docker run -d --name web nginx.",
    initialWorkspace: [],
    initialImages: [],
    initialContainers: [],
    objectives: [
        {
            id: "pull-nginx",
            description: "Pull nginx:latest",
            predicate: (ctx) => hasImage(ctx, "nginx:latest"),
        },
        {
            id: "run-nginx",
            description: "Run a container from nginx:latest",
            predicate: (ctx) => hasRunningContainerByImage(ctx, "nginx:latest"),
        },
    ],
};

const lesson2: Lesson = {
    id: "lesson-02-build",
    title: "Write a Dockerfile and Build",
    description:
        "Open Dockerfile, ensure it is valid, then run docker build -t myapp .",
    initialWorkspace: [
        {
            path: "Dockerfile",
            language: "dockerfile",
            content: [
                "FROM node:18-alpine",
                "WORKDIR /app",
                "COPY package.json .",
                "RUN npm install",
                'CMD ["node", "server.js"]',
                "",
            ].join("\n"),
        },
    ],
    initialImages: [],
    initialContainers: [],
    objectives: [
        {
            id: "build-myapp",
            description: "Build the image myapp:latest",
            predicate: (ctx) => hasImage(ctx, "myapp:latest"),
        },
    ],
};

const lesson3: Lesson = {
    id: "lesson-03-fix-dockerfile",
    title: "Fix a Broken Dockerfile",
    description:
        "This Dockerfile is broken. Fix it so docker build -t debug-app . succeeds.",
    initialWorkspace: [
        {
            path: "Dockerfile",
            language: "dockerfile",
            content: ['RUN echo "hello"', "COPY only-one-arg", ""].join("\n"),
        },
    ],
    initialImages: [],
    initialContainers: [],
    objectives: [
        {
            id: "build-debug-app",
            description: "Build the image debug-app:latest",
            predicate: (ctx) => hasImage(ctx, "debug-app:latest"),
        },
    ],
};

const lesson4: Lesson = {
    id: "lesson-04-compose-up",
    title: "Compose Two Services",
    description:
        "Create a two-service compose file and start both services with docker compose up -d.",
    initialWorkspace: [
        {
            path: "compose.yml",
            language: "yaml",
            content: [
                "services:",
                "  web:",
                "    image: nginx",
                "    ports:",
                '      - "8080:80"',
                "  db:",
                "    image: postgres",
                "    depends_on:",
                "      - web",
                "",
            ].join("\n"),
        },
    ],
    initialImages: [],
    initialContainers: [],
    objectives: [
        {
            id: "compose-up",
            description: "Bring up the web and db services",
            predicate: (ctx) =>
                hasComposeStack(ctx, ["web", "db"]) &&
                hasRunningContainerByName(ctx, "web") &&
                hasRunningContainerByName(ctx, "db"),
        },
    ],
};

const lesson5: Lesson = {
    id: "lesson-05-fix-compose",
    title: "Fix a Broken Compose File",
    description:
        "Fix the compose.yml errors and bring the stack up with docker compose up -d.",
    initialWorkspace: [
        {
            path: "compose.yml",
            language: "yaml",
            content: [
                "services:",
                "  web:",
                "    image: nginx",
                "    ports:",
                '      - "8080:abc"',
                "  db:",
                "    depends_on:",
                "      - web",
                "",
            ].join("\n"),
        },
    ],
    initialImages: [],
    initialContainers: [],
    objectives: [
        {
            id: "fix-compose",
            description: "Start the web and db services",
            predicate: (ctx) =>
                hasComposeStack(ctx, ["web", "db"]) &&
                hasRunningContainerByName(ctx, "web") &&
                hasRunningContainerByName(ctx, "db"),
        },
    ],
};

export const lessons: Lesson[] = [lesson1, lesson2, lesson3, lesson4, lesson5];
