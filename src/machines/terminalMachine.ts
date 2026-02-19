import { setup, assign, type ActorRef, type ActorRefFrom } from "xstate";
import { parseCommand } from "../engine/parser";
import { engineMachine, type CommandCompleteEvent } from "./engineMachine";

type TerminalLine = {
    text: string;
    kind: "output" | "error" | "info" | "success";
};

type TerminalContext = {
    inputBuffer: string;
    outputLines: TerminalLine[];
    isRunning: boolean;
    history: string[];
    historyIndex: number;
    tempHistoryBuffer: string;
    engineActor: ActorRefFrom<typeof engineMachine> | null;
};

type KeyInputEvent = { type: "KEY_INPUT"; key: string };
type EnterPressedEvent = { type: "ENTER_PRESSED" };
type HistoryEvent = { type: "HISTORY_UP" } | { type: "HISTORY_DOWN" };

type TerminalInput = {
    engineActor: ActorRefFrom<typeof engineMachine>;
};

type TerminalEvent =
    | KeyInputEvent
    | EnterPressedEvent
    | HistoryEvent
    | CommandCompleteEvent;

const defaultTerminalContext: TerminalContext = {
    inputBuffer: "",
    outputLines: [],
    isRunning: false,
    history: [],
    historyIndex: -1,
    tempHistoryBuffer: "",
    engineActor: null,
};

export const terminalMachine = setup({
    types: {
        context: {} as TerminalContext,
        events: {} as TerminalEvent,
        input: {} as TerminalInput,
    },
    actions: {
        appendOutput: assign({
            outputLines: ({ context, event }) => {
                const lines = (event as CommandCompleteEvent).lines || [];
                return [...context.outputLines, ...lines];
            },
        }),
        echoCommand: assign({
            outputLines: ({ context }) => [
                ...context.outputLines,
                { text: `yard:/project$ ${context.inputBuffer}`, kind: "output" as const },
            ],
            history: ({ context }) => context.inputBuffer.trim() ? [context.inputBuffer, ...context.history] : context.history,
            inputBuffer: "",
            historyIndex: -1,
            isRunning: true,
        }),
        handleHistoryUp: assign(({ context }) => {
            if (context.history.length === 0) return context;
            const newIndex = Math.min(context.historyIndex + 1, context.history.length - 1);

            const temp = context.historyIndex === -1 ? context.inputBuffer : context.tempHistoryBuffer;
            return {
                historyIndex: newIndex,
                inputBuffer: context.history[newIndex],
                tempHistoryBuffer: temp,
            };
        }),
        handleHistoryDown: assign(({ context }) => {
            if (context.historyIndex === -1) return context;
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
    }),
    states: {
        ready: {
            on: {
                KEY_INPUT: {
                    actions: assign({
                        inputBuffer: ({ context, event }) => {
                            if (event.key === "Backspace") {
                                return context.inputBuffer.slice(0, -1);
                            } else if (event.key.length === 1) {
                                return context.inputBuffer + event.key;
                            }
                            return context.inputBuffer;
                        },
                    }),
                },
                ENTER_PRESSED: { target: "dispatching", actions: "echoCommand" },
                HISTORY_UP: { actions: "handleHistoryUp" },
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
                context.engineActor.send({
                    type: "SUBMIT_COMMAND",
                    raw,
                    parsed,
                    replyTo: self as ActorRef<any, CommandCompleteEvent>
                });
            },
            on: {
                COMMAND_COMPLETE: {
                    target: "ready",
                    actions: [
                        "appendOutput",
                        assign({ isRunning: false })
                    ],
                },
            },
        },
    },
});
