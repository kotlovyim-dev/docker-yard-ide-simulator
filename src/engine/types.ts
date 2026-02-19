import { z } from "zod";
import {
    ImageRecordSchema,
    ContainerRecordSchema,
    NetworkRecordSchema,
    VolumeRecordSchema,
    EngineEventSchema,
    WorkspaceFileSchema,
    DiagnosticSchema,
    LessonSchema,
    EngineContextSchema,
    WorkspaceContextSchema,
    LessonContextSchema,
    ParsedCommandSchema,
    PortMappingSchema,
    VolumeMountSchema,
    ObjectiveSchema,
} from "./schema";

export type ImageRecord = z.infer<typeof ImageRecordSchema>;
export type ContainerRecord = z.infer<typeof ContainerRecordSchema>;
export type NetworkRecord = z.infer<typeof NetworkRecordSchema>;
export type VolumeRecord = z.infer<typeof VolumeRecordSchema>;
export type EngineEvent = z.infer<typeof EngineEventSchema>;
export type WorkspaceFile = z.infer<typeof WorkspaceFileSchema>;
export type Diagnostic = z.infer<typeof DiagnosticSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type EngineContext = z.infer<typeof EngineContextSchema>;
export type WorkspaceContext = z.infer<typeof WorkspaceContextSchema>;
export type LessonContext = z.infer<typeof LessonContextSchema>;
export type ParsedCommand = z.infer<typeof ParsedCommandSchema>;
export type PortMapping = z.infer<typeof PortMappingSchema>;
export type VolumeMount = z.infer<typeof VolumeMountSchema>;

export type ContainerStatus = ContainerRecord["status"];
export type NetworkDriver = NetworkRecord["driver"];
export type WorkspaceFileLanguage = WorkspaceFile["language"];
export type DiagnosticSeverity = Diagnostic["severity"];

export type ObjectivePredicate = (ctx: EngineContext) => boolean;

export type Objective = z.infer<typeof ObjectiveSchema> & {
    predicate: ObjectivePredicate;
};
