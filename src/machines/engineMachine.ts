import { setup, assign, fromPromise, type BaseActorRef } from "xstate";
import type { EngineContext, ParsedCommand, WorkspaceFile } from "../engine/types";
import { evaluateCommand, type WorkspaceSnapshot } from "../engine/commands/evaluator";

export type CommandOutputLine = {
    text: string;
    kind: "output" | "error" | "warning" | "info" | "success";
};

export type CommandCompleteEvent = {
    type: "COMMAND_COMPLETE";
    lines: CommandOutputLine[];
};

export type SubmitCommandEvent = {
    type: "SUBMIT_COMMAND";
    raw: string;
    parsed: ParsedCommand;
    replyTo: BaseActorRef<CommandCompleteEvent>;
    workspace?: Record<string, WorkspaceFile>;
};

type AcknowledgeErrorEvent = { type: "ACKNOWLEDGE_ERROR" };
type ResetToSnapshotEvent = { type: "RESET_TO_SNAPSHOT"; snapshot: EngineContext };

type MachineEvent =
    | SubmitCommandEvent
    | AcknowledgeErrorEvent
    | ResetToSnapshotEvent
    | CommandCompleteEvent;

interface ExtendedContext extends EngineContext {
    pendingReplyTo: BaseActorRef<CommandCompleteEvent> | null;
    pendingWorkspace: WorkspaceSnapshot | undefined;
}

const defaultContext: ExtendedContext = {
    images: {},
    containers: {},
    networks: {},
    volumes: {},
    eventLog: [],
    boundPorts: {},
    pendingCommand: null,
    lastError: null,
    pendingReplyTo: null,
    pendingWorkspace: undefined,
};

function classifyLine(text: string): CommandOutputLine["kind"] {
    const t = text.trimStart();
    if (t.startsWith("WARNING:") || t.startsWith("WARN ")) return "warning";
    if (
        t.startsWith("#") && /ERROR/.test(t) ||
        t.startsWith("Error") ||
        t.startsWith("error:") ||
        t.startsWith("failed to") ||
        t.startsWith("validating compose file:")
    ) return "error";
    if (t.startsWith("Successfully")) return "success";
    return "output";
}

function toOutputLines(raw: string[]): CommandOutputLine[] {
    return raw.map((text) => ({ text, kind: classifyLine(text) }));
}

export const engineMachine = setup({
    types: {
        context: {} as ExtendedContext,
        events: {} as MachineEvent,
        input: {} as { initialContext?: Partial<EngineContext> },
    },

    actors: {
        executor: fromPromise(async ({
            input,
        }: {
            input: { ctx: EngineContext; cmd: ParsedCommand; workspace?: WorkspaceSnapshot };
        }) => {
            return evaluateCommand(input.ctx, input.cmd, input.workspace);
        }),
    },

    delays: {
        errorAutoClear: 50,
    },
}).createMachine({
    id: "engine",
    initial: "idle",
    context: ({ input }) => ({
        ...defaultContext,
        ...input?.initialContext,
    }),

    states: {
        idle: {
            on: {
                SUBMIT_COMMAND: {
                    target: "executing",
                    actions: assign({
                        pendingCommand: ({ event }) => event.parsed,
                        pendingReplyTo: ({ event }) => event.replyTo,
                        pendingWorkspace: ({ event }) => event.workspace,
                    }),
                },
                RESET_TO_SNAPSHOT: {
                    actions: assign(({ event }) => ({
                        ...event.snapshot,
                        pendingReplyTo: null,
                        pendingWorkspace: undefined,
                    })),
                },
            },
        },

        executing: {
            invoke: {
                id: "executor",
                src: "executor",
                input: ({ context }) => ({
                    ctx: context,
                    cmd: context.pendingCommand!,
                    workspace: context.pendingWorkspace,
                }),
                onDone: {
                    target: "idle",
                    actions: [
                        assign(({ context, event }) => ({
                            ...context,
                            ...event.output.context,
                            eventLog: [...context.eventLog, ...event.output.events],
                            pendingCommand: null,
                            pendingWorkspace: undefined,
                        })),
                        ({ context, event }) => {
                            context.pendingReplyTo?.send({
                                type: "COMMAND_COMPLETE",
                                lines: toOutputLines(event.output.output),
                            });
                        },
                        assign({ pendingReplyTo: null }),
                    ],
                },
                onError: {
                    target: "error",
                    actions: [
                        assign({
                            lastError: ({ event }) => String(event.error),
                            pendingCommand: null,
                            pendingWorkspace: undefined,
                        }),
                        ({ context, event }) => {
                            context.pendingReplyTo?.send({
                                type: "COMMAND_COMPLETE",
                                lines: [{ text: `Error: ${String(event.error)}`, kind: "error" }],
                            });
                        },
                        assign({ pendingReplyTo: null }),
                    ],
                },
            },
        },

        error: {
            after: {
                errorAutoClear: { target: "idle", actions: assign({ lastError: null }) },
            },
            on: {
                ACKNOWLEDGE_ERROR: {
                    target: "idle",
                    actions: assign({ lastError: null }),
                },
            },
        },
    },
});
