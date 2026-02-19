import { setup } from "xstate";
import type { LessonContext, EngineContext } from "../engine/types";

type SelectLessonEvent = { type: "SELECT_LESSON"; lessonId: string };
type CheckObjectivesEvent = { type: "CHECK_OBJECTIVES"; engineSnapshot: EngineContext };
type RestartLessonEvent = { type: "RESTART_LESSON" };
type ExitToMenuEvent = { type: "EXIT_TO_MENU" };
type ContinueEvent = { type: "CONTINUE" };

type LessonEvent =
    | SelectLessonEvent
    | CheckObjectivesEvent
    | RestartLessonEvent
    | ExitToMenuEvent
    | ContinueEvent;

const defaultLessonContext: LessonContext = {
    currentLessonId: null,
    currentObjectiveIndex: 0,
    completedLessonIds: [],
    scenarioSnapshot: null,
    availableLessons: [],
};

export const lessonMachine = setup({
    types: {
        context: {} as LessonContext,
        events: {} as LessonEvent,
    },
}).createMachine({
    id: "lesson",
    initial: "menu",
    context: defaultLessonContext,
    states: {
        menu: {
            on: {
                SELECT_LESSON: { target: "loading" },
            },
        },
        loading: {
            on: {
                EXIT_TO_MENU: { target: "menu" },
            },
        },
        active: {
            on: {
                CHECK_OBJECTIVES: { target: "active" },
                RESTART_LESSON: { target: "loading" },
                EXIT_TO_MENU: { target: "menu" },
            },
        },
        celebrating: {
            on: {
                CONTINUE: { target: "menu" },
            },
        },
    },
});
