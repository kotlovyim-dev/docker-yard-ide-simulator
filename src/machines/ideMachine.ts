import { setup } from "xstate";
import type { WorkspaceContext } from "../engine/types";

type PanelId = "explorer" | "editor" | "yard" | "terminal";

type EditorReadyEvent = { type: "EDITOR_READY" };
type OpenFileEvent = { type: "OPEN_FILE"; path: string };
type CloseTabEvent = { type: "CLOSE_TAB"; path: string };
type UpdateFileContentEvent = { type: "UPDATE_FILE_CONTENT"; path: string; content: string };
type CreateFileEvent = { type: "CREATE_FILE"; path: string; language: string };
type DeleteFileEvent = { type: "DELETE_FILE"; path: string };
type TogglePanelEvent = { type: "TOGGLE_PANEL"; panel: PanelId };

type IdeEvent =
    | EditorReadyEvent
    | OpenFileEvent
    | CloseTabEvent
    | UpdateFileContentEvent
    | CreateFileEvent
    | DeleteFileEvent
    | TogglePanelEvent;

type IdeContext = WorkspaceContext & {
    editorReady: boolean;
};

const defaultIdeContext: IdeContext = {
    files: {},
    activeFilePath: null,
    diagnostics: {},
    openTabs: [],
    editorReady: false,
};

export const ideMachine = setup({
    types: {
        context: {} as IdeContext,
        events: {} as IdeEvent,
    },
}).createMachine({
    id: "ide",
    initial: "loading",
    context: defaultIdeContext,
    states: {
        loading: {
            on: {
                EDITOR_READY: {
                    target: "idle",
                    actions: () => { },
                },
            },
        },
        idle: {
            on: {
                OPEN_FILE: { target: "idle" },
                CLOSE_TAB: { target: "idle" },
                UPDATE_FILE_CONTENT: { target: "validating" },
                CREATE_FILE: { target: "idle" },
                DELETE_FILE: { target: "idle" },
                TOGGLE_PANEL: { target: "idle" },
            },
        },
        validating: {
            on: {
                EDITOR_READY: { target: "idle" },
            },
        },
    },
});
