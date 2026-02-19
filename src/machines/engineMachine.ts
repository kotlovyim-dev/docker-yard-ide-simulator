import { setup } from "xstate";
import type { EngineContext } from "../engine/types";

type EngineInput = {
    initialContext?: Partial<EngineContext>;
};

type SubmitCommandEvent = {
    type: "SUBMIT_COMMAND";
    raw: string;
};

type AcknowledgeErrorEvent = {
    type: "ACKNOWLEDGE_ERROR";
};

type ResetToSnapshotEvent = {
    type: "RESET_TO_SNAPSHOT";
    snapshot: EngineContext;
};

type EngineEvent =
    | SubmitCommandEvent
    | AcknowledgeErrorEvent
    | ResetToSnapshotEvent;

const defaultContext: EngineContext = {
    images: {},
    containers: {},
    networks: {},
    volumes: {},
    eventLog: [],
    boundPorts: {},
};

export const engineMachine = setup({
    types: {
        context: {} as EngineContext,
        events: {} as EngineEvent,
        input: {} as EngineInput,
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
                SUBMIT_COMMAND: { target: "executing" },
                RESET_TO_SNAPSHOT: {
                    target: "idle",
                    actions: ({ context: _ctx, event }) => {
                        void event.snapshot;
                    },
                },
            },
        },
        executing: {
            on: {
                ACKNOWLEDGE_ERROR: { target: "idle" },
            },
        },
    },
});
