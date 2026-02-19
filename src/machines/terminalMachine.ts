import { setup } from "xstate";

type TerminalLine = {
    text: string;
    kind: "output" | "error" | "info";
};

type TerminalContext = {
    inputBuffer: string;
    outputLines: TerminalLine[];
    isRunning: boolean;
    history: string[];
    historyIndex: number;
};

type KeyInputEvent = { type: "KEY_INPUT"; key: string };
type EnterPressedEvent = { type: "ENTER_PRESSED" };
type CommandCompleteEvent = { type: "COMMAND_COMPLETE"; lines: TerminalLine[] };

type TerminalEvent = KeyInputEvent | EnterPressedEvent | CommandCompleteEvent;

const defaultTerminalContext: TerminalContext = {
    inputBuffer: "",
    outputLines: [],
    isRunning: false,
    history: [],
    historyIndex: -1,
};

export const terminalMachine = setup({
    types: {
        context: {} as TerminalContext,
        events: {} as TerminalEvent,
    },
}).createMachine({
    id: "terminal",
    initial: "ready",
    context: defaultTerminalContext,
    states: {
        ready: {
            on: {
                KEY_INPUT: { target: "ready" },
                ENTER_PRESSED: { target: "dispatching" },
            },
        },
        dispatching: {
            on: {
                COMMAND_COMPLETE: { target: "ready" },
            },
        },
    },
});
