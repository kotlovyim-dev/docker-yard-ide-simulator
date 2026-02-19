import { setup, assign, type BaseActorRef, type ActorRefFrom } from "xstate";
import { parseCommand } from "../engine/parser";
import { engineMachine, type CommandCompleteEvent, type CommandOutputLine } from "./engineMachine";
import type { WorkspaceFile } from "../engine/types";

export type { CommandOutputLine };

type TerminalContext = {
    inputBuffer: string;
    outputLines: CommandOutputLine[];
    isRunning: boolean;
    history: string[];
    historyIndex: number;
    tempHistoryBuffer: string;
    engineActor: ActorRefFrom<typeof engineMachine> | null;
    getWorkspace: (() => Record<string, WorkspaceFile>) | null;
};

type KeyInputEvent = { type: "KEY_INPUT"; key: string };
type EnterPressedEvent = { type: "ENTER_PRESSED" };
type HistoryUpEvent = { type: "HISTORY_UP" };
type HistoryDownEvent = { type: "HISTORY_DOWN" };

type TerminalInput = {
    engineActor: ActorRefFrom<typeof engineMachine>;
    getWorkspace?: () => Record<string, WorkspaceFile>;
};

type TerminalEvent =
    | KeyInputEvent
    | EnterPressedEvent
    | HistoryUpEvent
    | HistoryDownEvent
    | CommandCompleteEvent;

const defaultTerminalContext: TerminalContext = {
    inputBuffer: "",
    outputLines: [],
    isRunning: false,
    history: [],
    historyIndex: -1,
    tempHistoryBuffer: "",
    engineActor: null,
    getWorkspace: null,
};

export const terminalMachine = setup({
    types: {
        context: {} as TerminalContext,
        events: {} as TerminalEvent,
        input: {} as TerminalInput,
    },

    guards: {
        hasInput: ({ context }) => context.inputBuffer.trim().length > 0,
        hasHistory: ({ context }) => context.history.length > 0,
    },

    actions: {
        appendOutput: assign({
            outputLines: ({ context, event }) => {
                const lines = (event as CommandCompleteEvent).lines ?? [];
                return [...context.outputLines, ...lines];
            },
        }),

        echoCommand: assign({
            outputLines: ({ context }) => [
                ...context.outputLines,
                { text: `yard:/project$ ${context.inputBuffer}`, kind: "output" as const },
            ],
            history: ({ context }) =>
                context.inputBuffer.trim()
                    ? [context.inputBuffer, ...context.history]
                    : context.history,
            inputBuffer: "",
            historyIndex: -1,
            tempHistoryBuffer: "",
            isRunning: true,
        }),

        handleHistoryUp: assign(({ context }) => {
            if (context.history.length === 0) return {};
            const newIndex = Math.min(context.historyIndex + 1, context.history.length - 1);
            const temp = context.historyIndex === -1 ? context.inputBuffer : context.tempHistoryBuffer;
            return {
                historyIndex: newIndex,
                inputBuffer: context.history[newIndex],
                tempHistoryBuffer: temp,
            };
        }),

        handleHistoryDown: assign(({ context }) => {
            if (context.historyIndex === -1) return {};
            const newIndex = Math.max(context.historyIndex - 1, -1);
            return {
                historyIndex: newIndex,
                inputBuffer: newIndex === -1 ? context.tempHistoryBuffer : context.history[newIndex],
            };
        }),
    },
}).createMachine({
    id: "terminal",
    initial: "ready",
    context: ({ input }) => ({
        ...defaultTerminalContext,
        engineActor: input.engineActor,
        getWorkspace: input.getWorkspace ?? null,
    }),

    states: {
        ready: {
            on: {
                KEY_INPUT: {
                    actions: assign({
                        inputBuffer: ({ context, event }) => {
                            if (event.key === "Backspace") return context.inputBuffer.slice(0, -1);
                            if (event.key.length === 1) return context.inputBuffer + event.key;
                            return context.inputBuffer;
                        },
                    }),
                },

                ENTER_PRESSED: [
                    {
                        guard: "hasInput",
                        target: "dispatching",
                        actions: "echoCommand",
                    },
                    {
                        actions: assign({
                            outputLines: ({ context }) => [
                                ...context.outputLines,
                                { text: `yard:/project$ `, kind: "output" as const },
                            ],
                        }),
                    },
                ],

                HISTORY_UP: { guard: "hasHistory", actions: "handleHistoryUp" },
                HISTORY_DOWN: { actions: "handleHistoryDown" },
            },
        },

        dispatching: {
            entry: ({ context, self }) => {
                const raw = context.history[0];
                if (!raw || !context.engineActor) {
                    self.send({ type: "COMMAND_COMPLETE", lines: [] });
                    return;
                }

                const parsed = parseCommand(raw);
                const workspace = context.getWorkspace?.() ?? undefined;

                context.engineActor.send({
                    type: "SUBMIT_COMMAND",
                    raw,
                    parsed,
                    replyTo: self as BaseActorRef<CommandCompleteEvent>,
                    workspace,
                });
            },

            on: {
                COMMAND_COMPLETE: {
                    target: "ready",
                    actions: [
                        "appendOutput",
                        assign({ isRunning: false }),
                    ],
                },
            },
        },
    },
});
