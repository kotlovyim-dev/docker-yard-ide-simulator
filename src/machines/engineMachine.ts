import { setup, assign, type ActorRef, fromPromise } from "xstate";
import type { EngineContext, ParsedCommand } from "../engine/types";
import { evaluateCommand } from "../engine/commands/evaluator";

type EngineInput = {
    initialContext?: Partial<EngineContext>;
};

export type SubmitCommandEvent = {
    type: "SUBMIT_COMMAND";
    raw: string;
    parsed: ParsedCommand;
    replyTo: ActorRef<any, CommandCompleteEvent>;
};

type AcknowledgeErrorEvent = {
    type: "ACKNOWLEDGE_ERROR";
};

type ResetToSnapshotEvent = {
    type: "RESET_TO_SNAPSHOT";
    snapshot: EngineContext;
};

export type CommandCompleteEvent = {
    type: "COMMAND_COMPLETE";
    lines?: { text: string; kind: "info" | "error" | "success" | "output" }[];
};

type MachineEvent =
    | SubmitCommandEvent
    | AcknowledgeErrorEvent
    | ResetToSnapshotEvent
    | CommandCompleteEvent;

const defaultContext: EngineContext = {
    images: {},
    containers: {},
    networks: {},
    volumes: {},
    eventLog: [],
    boundPorts: {},
    pendingCommand: null,
    lastError: null,
};

interface ExtendedContext extends EngineContext {
    pendingReplyTo: ActorRef<any, CommandCompleteEvent> | null;
}

export const engineMachine = setup({
    types: {
        context: {} as ExtendedContext,
        events: {} as MachineEvent,
        input: {} as EngineInput,
    },
    actors: {
        executor: fromPromise(async ({ input }: { input: { ctx: EngineContext; cmd: ParsedCommand } }) => {
            const result = evaluateCommand(input.ctx, input.cmd);
            return result;
        }),
    },
}).createMachine({
    id: "engine",
    initial: "idle",
    context: ({ input }) => ({
        ...defaultContext,
        pendingReplyTo: null,
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
                    }),
                },
                RESET_TO_SNAPSHOT: {
                    target: "idle",
                    actions: assign(({ event }) => ({
                        ...event.snapshot,
                        pendingReplyTo: null,
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
                }),
                onDone: {
                    target: "idle",
                    actions: [
                        assign(({ context, event }) => {
                            return {
                                ...context,
                                ...event.output.context,
                                eventLog: [...context.eventLog, ...event.output.events],
                                pendingCommand: null,
                            };
                        }),
                        ({ context, event }) => {
                            if (context.pendingReplyTo) {
                                context.pendingReplyTo.send({
                                    type: "COMMAND_COMPLETE",
                                    lines: event.output.output.map((text) => ({
                                        text,
                                        kind: "output" as const,
                                    })),
                                });
                            }
                        },
                        assign({ pendingReplyTo: null }),
                    ],
                },
                onError: {
                    target: "idle",
                    actions: [
                        ({ context, event }) => {
                            if (context.pendingReplyTo) {
                                context.pendingReplyTo.send({
                                    type: "COMMAND_COMPLETE",
                                    lines: [
                                        { text: `Error: ${String(event.error)}`, kind: "error" },
                                    ],
                                });
                            }
                        },
                        assign({ pendingReplyTo: null, pendingCommand: null }),
                    ],
                },
            },
        },
    },
});
