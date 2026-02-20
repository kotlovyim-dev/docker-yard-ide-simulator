import { z } from "zod";

export const ImageRecordSchema = z.object({
    id: z.string(),
    repository: z.string(),
    tag: z.string(),
    size: z.number(),
    createdAt: z.string(),
    layers: z.array(z.string()),
});

export const PortMappingSchema = z.object({
    hostPort: z.number(),
    containerPort: z.number(),
    protocol: z.enum(["tcp", "udp"]),
});

export const VolumeMountSchema = z.object({
    volumeId: z.string(),
    mountPath: z.string(),
});

export const ContainerStatusSchema = z.enum([
    "created",
    "running",
    "stopped",
    "removed",
]);

export const ContainerRecordSchema = z.object({
    id: z.string(),
    name: z.string(),
    imageId: z.string(),
    status: ContainerStatusSchema,
    ports: z.array(PortMappingSchema),
    env: z.record(z.string(), z.string()),
    createdAt: z.string(),
    startedAt: z.string().nullable(),
    stoppedAt: z.string().nullable(),
    logs: z.array(z.string()),
    networkIds: z.array(z.string()),
    volumeMounts: z.array(VolumeMountSchema),
});

export const NetworkDriverSchema = z.enum([
    "bridge",
    "overlay",
    "host",
    "none",
]);

export const NetworkRecordSchema = z.object({
    id: z.string(),
    name: z.string(),
    driver: NetworkDriverSchema,
    containerIds: z.array(z.string()),
});

export const VolumeRecordSchema = z.object({
    id: z.string(),
    name: z.string(),
    mountpoint: z.string(),
});

export const ComposeStackSchema = z.object({
    name: z.string(),
    serviceNames: z.array(z.string()),
    containerIds: z.record(z.string(), z.string()),
});

export const EngineEventSchema = z.object({
    id: z.string(),
    type: z.string(),
    timestamp: z.string(),
    payload: z.record(z.string(), z.unknown()),
    humanSummary: z.string(),
});

export const WorkspaceFileLanguageSchema = z.enum([
    "dockerfile",
    "yaml",
    "javascript",
    "sh",
    "text",
]);

export const WorkspaceFileSchema = z.object({
    path: z.string(),
    content: z.string(),
    language: WorkspaceFileLanguageSchema,
});

export const DiagnosticSeveritySchema = z.enum(["error", "warning"]);

export const DiagnosticSchema = z.object({
    ruleId: z.string(),
    severity: DiagnosticSeveritySchema,
    line: z.number(),
    col: z.number(),
    endLine: z.number(),
    endCol: z.number(),
    message: z.string(),
    explanation: z.string(),
    fix: z.string().optional(),
});

export const ObjectiveSchema = z.object({
    id: z.string(),
    description: z.string(),
});

export const LessonSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(), 
    initialWorkspace: z.array(WorkspaceFileSchema),
    initialImages: z.array(ImageRecordSchema),
    initialContainers: z.array(ContainerRecordSchema),
    objectives: z.array(ObjectiveSchema),
});

export const ParsedCommandSchema = z.object({
    raw: z.string(),
    command: z.string(),
    subcommand: z.string().nullable(),
    args: z.array(z.string()),
    flags: z.record(
        z.string(),
        z.union([z.string(), z.boolean(), z.array(z.string())]),
    ),
});

export const EngineContextSchema = z.object({
    images: z.record(z.string(), ImageRecordSchema),
    containers: z.record(z.string(), ContainerRecordSchema),
    networks: z.record(z.string(), NetworkRecordSchema),
    volumes: z.record(z.string(), VolumeRecordSchema),
    composeStacks: z.record(z.string(), ComposeStackSchema),
    eventLog: z.array(EngineEventSchema),
    boundPorts: z.record(z.string(), z.string()),
    pendingCommand: ParsedCommandSchema.nullable(),
    lastError: z.string().nullable(),
});

export const WorkspaceContextSchema = z.object({
    files: z.record(z.string(), WorkspaceFileSchema),
    activeFilePath: z.string().nullable(),
    diagnostics: z.record(z.string(), z.array(DiagnosticSchema)),
    openTabs: z.array(z.string()),
});

export const ScenarioSnapshotSchema = z.object({
    images: z.record(z.string(), ImageRecordSchema),
    containers: z.record(z.string(), ContainerRecordSchema),
    files: z.record(z.string(), WorkspaceFileSchema),
});

export const LessonContextSchema = z.object({
    currentLessonId: z.string().nullable(),
    currentObjectiveIndex: z.number(),
    completedLessonIds: z.array(z.string()),
    scenarioSnapshot: ScenarioSnapshotSchema.nullable(),
    availableLessons: z.array(LessonSchema),
});
