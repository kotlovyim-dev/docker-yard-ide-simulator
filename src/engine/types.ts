export type ImageRecord = {
    id: string;
    repository: string;
    tag: string;
    size: number;
    createdAt: string;
    layers: string[];
};

export type PortMapping = {
    hostPort: number;
    containerPort: number;
    protocol: "tcp" | "udp";
};

export type VolumeMount = {
    volumeId: string;
    mountPath: string;
};

export type ContainerStatus = "created" | "running" | "stopped" | "removed";

export type ContainerRecord = {
    id: string;
    name: string;
    imageId: string;
    status: ContainerStatus;
    ports: PortMapping[];
    env: Record<string, string>;
    createdAt: string;
    startedAt: string | null;
    stoppedAt: string | null;
    logs: string[];
    networkIds: string[];
    volumeMounts: VolumeMount[];
};

export type NetworkRecord = {
    id: string;
    name: string;
    driver: "bridge" | "overlay" | "host" | "none";
    containerIds: string[];
};

export type VolumeRecord = {
    id: string;
    name: string;
    mountpoint: string;
};

export type EngineEvent = {
    id: string;
    type: string;
    timestamp: string;
    payload: Record<string, unknown>;
    humanSummary: string;
};

export type WorkspaceFileLanguage =
    | "dockerfile"
    | "yaml"
    | "javascript"
    | "sh"
    | "text";

export type WorkspaceFile = {
    path: string;
    content: string;
    language: WorkspaceFileLanguage;
};

export type DiagnosticSeverity = "error" | "warning";

export type Diagnostic = {
    ruleId: string;
    severity: DiagnosticSeverity;
    line: number;
    col: number;
    endLine: number;
    endCol: number;
    message: string;
    explanation: string;
    fix?: string;
};

export type ObjectivePredicate = (ctx: EngineContext) => boolean;

export type Objective = {
    id: string;
    description: string;
    predicate: ObjectivePredicate;
};

export type Lesson = {
    id: string;
    title: string;
    description: string;
    initialWorkspace: WorkspaceFile[];
    initialImages: ImageRecord[];
    initialContainers: ContainerRecord[];
    objectives: Objective[];
};

export type EngineContext = {
    images: Record<string, ImageRecord>;
    containers: Record<string, ContainerRecord>;
    networks: Record<string, NetworkRecord>;
    volumes: Record<string, VolumeRecord>;
    eventLog: EngineEvent[];
    boundPorts: Record<number, string>;
};

export type WorkspaceContext = {
    files: Record<string, WorkspaceFile>;
    activeFilePath: string | null;
    diagnostics: Record<string, Diagnostic[]>;
    openTabs: string[];
};

export type LessonContext = {
    currentLessonId: string | null;
    currentObjectiveIndex: number;
    completedLessonIds: string[];
    scenarioSnapshot: {
        images: Record<string, ImageRecord>;
        containers: Record<string, ContainerRecord>;
        files: Record<string, WorkspaceFile>;
    } | null;
    availableLessons: Lesson[];
};

export type ParsedCommand = {
    raw: string;
    command: string;
    subcommand: string | null;
    args: string[];
    flags: Record<string, string | boolean>;
};
