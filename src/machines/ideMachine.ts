import { setup, assign, fromPromise } from "xstate";
import type { WorkspaceContext, WorkspaceFile, Diagnostic } from "../engine/types";
import { validate } from "../engine";

export type PanelId = "explorer" | "editor" | "yard" | "terminal";
export type PanelLayout = Record<PanelId, boolean>;

const defaultLayout: PanelLayout = {
    explorer: true,
    editor: true,
    yard: true,
    terminal: true,
};

type EditorReadyEvent = { type: "EDITOR_READY" };
type OpenFileEvent = { type: "OPEN_FILE"; path: string };
type CloseTabEvent = { type: "CLOSE_TAB"; path: string };
type UpdateFileEvent = { type: "UPDATE_FILE_CONTENT"; path: string; content: string };
type CreateFileEvent = { type: "CREATE_FILE"; path: string; language: WorkspaceFile["language"] };
type DeleteFileEvent = { type: "DELETE_FILE"; path: string };
type TogglePanelEvent = { type: "TOGGLE_PANEL"; panel: PanelId };

type IdeEvent =
    | EditorReadyEvent
    | OpenFileEvent
    | CloseTabEvent
    | UpdateFileEvent
    | CreateFileEvent
    | DeleteFileEvent
    | TogglePanelEvent;

export type IdeContext = WorkspaceContext & {
    editorReady: boolean;
    layout: PanelLayout;
    _pendingValidation: { path: string; content: string } | null;
};

const defaultIdeContext: IdeContext = {
    files: {},
    activeFilePath: null,
    diagnostics: {},
    openTabs: [],
    editorReady: false,
    layout: defaultLayout,
    _pendingValidation: null,
};

function languageForPath(path: string): WorkspaceFile["language"] {
    const lower = path.toLowerCase();
    if (lower === "dockerfile" || lower.endsWith(".dockerfile")) return "dockerfile";
    if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "yaml";
    if (lower.endsWith(".js") || lower.endsWith(".ts")) return "javascript";
    if (lower.endsWith(".sh")) return "sh";
    return "text";
}

function openTab(tabs: string[], path: string): string[] {
    return tabs.includes(path) ? tabs : [...tabs, path];
}

function closeTab(tabs: string[], path: string, active: string | null): [string[], string | null] {
    const next = tabs.filter((t) => t !== path);
    let nextActive = active;
    if (active === path) {
        const idx = tabs.indexOf(path);
        nextActive = next[idx] ?? next[idx - 1] ?? null;
    }
    return [next, nextActive];
}

export const ideMachine = setup({
    types: {
        context: {} as IdeContext,
        events: {} as IdeEvent,
        input: {} as { initialFiles?: Record<string, WorkspaceFile> },
    },

    actors: {
        validateFile: fromPromise(async ({
            input,
        }: {
            input: { path: string; content: string };
        }): Promise<{ path: string; diagnostics: Diagnostic[] }> => {
            const lang = languageForPath(input.path);
            if (lang !== "dockerfile" && lang !== "yaml") {
                return { path: input.path, diagnostics: [] };
            }
            const diagnostics = validate(lang, input.content);
            return { path: input.path, diagnostics };
        }),
    },
}).createMachine({
    id: "ide",
    initial: "idle",
    context: ({ input }) => ({
        ...defaultIdeContext,
        files: input?.initialFiles ?? {},
    }),

    states: {
        idle: {
            on: {
                EDITOR_READY: {
                    actions: assign({ editorReady: true }),
                },
                OPEN_FILE: {
                    actions: assign({
                        openTabs: ({ context, event }) => openTab(context.openTabs, event.path),
                        activeFilePath: ({ event }) => event.path,
                    }),
                },

                CLOSE_TAB: {
                    actions: assign(({ context, event }) => {
                        const [tabs, active] = closeTab(context.openTabs, event.path, context.activeFilePath);
                        return { openTabs: tabs, activeFilePath: active };
                    }),
                },

                CREATE_FILE: {
                    actions: assign(({ context, event }) => {
                        const lang = event.language ?? languageForPath(event.path);
                        const newFile: WorkspaceFile = { path: event.path, content: "", language: lang };
                        return {
                            files: { ...context.files, [event.path]: newFile },
                            openTabs: openTab(context.openTabs, event.path),
                            activeFilePath: event.path,
                        };
                    }),
                },

                DELETE_FILE: {
                    actions: assign(({ context, event }) => {
                        const files = { ...context.files };
                        delete files[event.path];
                        const diagnostics = { ...context.diagnostics };
                        delete diagnostics[event.path];
                        const [tabs, active] = closeTab(context.openTabs, event.path, context.activeFilePath);
                        return { files, diagnostics, openTabs: tabs, activeFilePath: active };
                    }),
                },

                TOGGLE_PANEL: {
                    actions: assign(({ context, event }) => ({
                        layout: {
                            ...context.layout,
                            [event.panel]: !context.layout[event.panel],
                        },
                    })),
                },

                UPDATE_FILE_CONTENT: {
                    target: "validating",
                    actions: assign(({ context, event }) => ({
                        files: {
                            ...context.files,
                            [event.path]: {
                                ...(context.files[event.path] ?? {
                                    path: event.path,
                                    language: languageForPath(event.path),
                                }),
                                content: event.content,
                            },
                        },
                        _pendingValidation: { path: event.path, content: event.content },
                    })),
                },
            },
        },

        validating: {
            invoke: {
                id: "validateFile",
                src: "validateFile",
                input: ({ context }) => context._pendingValidation!,
                onDone: {
                    target: "idle",
                    actions: assign(({ context, event }) => ({
                        diagnostics: {
                            ...context.diagnostics,
                            [event.output.path]: event.output.diagnostics,
                        },
                        _pendingValidation: null,
                    })),
                },
                onError: {
                    target: "idle",
                    actions: assign(({ context }) => ({
                        diagnostics: {
                            ...context.diagnostics,
                            ...(context._pendingValidation
                                ? { [context._pendingValidation.path]: [] }
                                : {}),
                        },
                        _pendingValidation: null,
                    })),
                },
            },
            on: {
                UPDATE_FILE_CONTENT: {
                    actions: assign(({ context, event }) => ({
                        files: {
                            ...context.files,
                            [event.path]: {
                                ...(context.files[event.path] ?? {
                                    path: event.path,
                                    language: languageForPath(event.path),
                                }),
                                content: event.content,
                            },
                        },
                        _pendingValidation: { path: event.path, content: event.content },
                    })),
                },
            },
        },
    },
});
