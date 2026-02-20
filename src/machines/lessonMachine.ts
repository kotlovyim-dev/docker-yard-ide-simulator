import { setup, assign, fromPromise, raise } from "xstate";
import type {
    LessonContext,
    EngineContext,
    Lesson,
    Objective,
} from "../engine/types";

export type SelectLessonEvent = { type: "SELECT_LESSON"; lessonId: string };
export type CheckObjectivesEvent = {
    type: "CHECK_OBJECTIVES";
    engineSnapshot: EngineContext;
};
export type ObjectiveCompleteEvent = { type: "OBJECTIVE_COMPLETE" };
export type RestartLessonEvent = { type: "RESTART_LESSON" };
export type ExitToMenuEvent = { type: "EXIT_TO_MENU" };
export type ContinueEvent = { type: "CONTINUE" };
export type HydrateProgressEvent = {
    type: "HYDRATE_PROGRESS";
    progress: InitialProgress;
};

type LessonEvent =
    | SelectLessonEvent
    | CheckObjectivesEvent
    | ObjectiveCompleteEvent
    | RestartLessonEvent
    | ExitToMenuEvent
    | ContinueEvent
    | HydrateProgressEvent;

type InitialProgress = {
    currentLessonId?: string | null;
    currentObjectiveIndex?: number;
    completedLessonIds?: string[];
};

const defaultLessonContext: LessonContext = {
    currentLessonId: null,
    currentObjectiveIndex: 0,
    completedLessonIds: [],
    scenarioSnapshot: null,
    availableLessons: [],
};

function findLesson(ctx: LessonContext, lessonId: string): Lesson | undefined {
    return ctx.availableLessons.find((l) => l.id === lessonId);
}

function buildScenarioSnapshot(lesson: Lesson) {
    return {
        images: Object.fromEntries(
            lesson.initialImages.map((img) => [img.id, img]),
        ),
        containers: Object.fromEntries(
            lesson.initialContainers.map((c) => [c.id, c]),
        ),
        files: Object.fromEntries(
            lesson.initialWorkspace.map((f) => [f.path, f]),
        ),
    };
}

function currentObjective(
    ctx: LessonContext,
): (Objective & { predicate?: (c: EngineContext) => boolean }) | undefined {
    if (!ctx.currentLessonId) return undefined;
    const lesson = findLesson(ctx, ctx.currentLessonId);
    return lesson?.objectives[ctx.currentObjectiveIndex] as
        | (Objective & { predicate?: (c: EngineContext) => boolean })
        | undefined;
}

export const lessonMachine = setup({
    types: {
        context: {} as LessonContext,
        events: {} as LessonEvent,
        input: {} as {
            availableLessons?: Lesson[];
            initialProgress?: InitialProgress;
        },
    },

    actors: {
        loadLesson: fromPromise(
            async ({
                input,
            }: {
                input: { ctx: LessonContext; lessonId: string };
            }): Promise<{ lesson: Lesson }> => {
                const lesson = input.ctx.availableLessons.find(
                    (l) => l.id === input.lessonId,
                );
                if (!lesson)
                    throw new Error(`Lesson '${input.lessonId}' not found.`);
                return { lesson };
            },
        ),
    },
}).createMachine({
    id: "lesson",
    initial: "menu",
    context: ({ input }) => {
        const availableLessons = input?.availableLessons ?? [];
        const initial = input?.initialProgress ?? {};
        const currentLessonId = initial.currentLessonId ?? null;
        const lessonExists = currentLessonId
            ? availableLessons.some((l) => l.id === currentLessonId)
            : false;

        return {
            ...defaultLessonContext,
            availableLessons,
            currentLessonId: lessonExists ? currentLessonId : null,
            currentObjectiveIndex: initial.currentObjectiveIndex ?? 0,
            completedLessonIds: initial.completedLessonIds ?? [],
        };
    },

    states: {
        menu: {
            on: {
                SELECT_LESSON: { target: "loading" },
                HYDRATE_PROGRESS: [
                    {
                        guard: ({ context, event }) => {
                            const lessonId = event.progress.currentLessonId;
                            if (!lessonId) return false;
                            return Boolean(findLesson(context, lessonId));
                        },
                        target: "active",
                        actions: assign(({ context, event }) => {
                            const lessonId =
                                event.progress.currentLessonId ?? null;
                            const lesson = lessonId
                                ? findLesson(context, lessonId)
                                : undefined;
                            return {
                                currentLessonId: lesson?.id ?? null,
                                currentObjectiveIndex:
                                    event.progress.currentObjectiveIndex ?? 0,
                                completedLessonIds:
                                    event.progress.completedLessonIds ?? [],
                                scenarioSnapshot: lesson
                                    ? buildScenarioSnapshot(lesson)
                                    : null,
                            };
                        }),
                    },
                    {
                        actions: assign(({ event }) => ({
                            currentLessonId: null,
                            currentObjectiveIndex:
                                event.progress.currentObjectiveIndex ?? 0,
                            completedLessonIds:
                                event.progress.completedLessonIds ?? [],
                            scenarioSnapshot: null,
                        })),
                    },
                ],
            },
        },

        loading: {
            invoke: {
                id: "loadLesson",
                src: "loadLesson",
                input: ({ context, event }) => ({
                    ctx: context,
                    lessonId:
                        (event as SelectLessonEvent).lessonId ??
                        context.currentLessonId,
                }),
                onDone: {
                    target: "active",
                    actions: assign(({ event }) => {
                        const lesson = event.output.lesson;
                        return {
                            currentLessonId: lesson.id,
                            currentObjectiveIndex: 0,
                            scenarioSnapshot: buildScenarioSnapshot(lesson),
                        };
                    }),
                },
                onError: {
                    target: "menu",
                },
            },
            on: {
                EXIT_TO_MENU: { target: "menu" },
            },
        },

        active: {
            on: {
                SELECT_LESSON: { target: "loading" },
                CHECK_OBJECTIVES: {
                    actions: [
                        assign(({ context, event }) => {
                            const obj = currentObjective(context);
                            if (!obj?.predicate) return {};
                            const passed = obj.predicate(event.engineSnapshot);
                            if (!passed) return {};
                            return {};
                        }),
                        raise(({ context, event }) => {
                            const obj = currentObjective(context);
                            if (!obj?.predicate)
                                return { type: "CONTINUE" as const };
                            const passed = obj.predicate(event.engineSnapshot);
                            if (passed)
                                return { type: "OBJECTIVE_COMPLETE" as const };
                            return { type: "CONTINUE" as const };
                        }),
                    ],
                },

                OBJECTIVE_COMPLETE: {
                    actions: assign(({ context }) => {
                        const lesson = findLesson(
                            context,
                            context.currentLessonId ?? "",
                        );
                        const totalObjectives = lesson?.objectives.length ?? 0;
                        const nextIndex = context.currentObjectiveIndex + 1;
                        if (nextIndex >= totalObjectives) {
                            return { currentObjectiveIndex: nextIndex };
                        }
                        return { currentObjectiveIndex: nextIndex };
                    }),
                    target: "checkingCompletion",
                },

                RESTART_LESSON: {
                    target: "loading",
                    actions: assign({ currentObjectiveIndex: 0 }),
                },

                EXIT_TO_MENU: {
                    target: "menu",
                    actions: assign({
                        currentLessonId: null,
                        currentObjectiveIndex: 0,
                        scenarioSnapshot: null,
                    }),
                },
            },
        },

        checkingCompletion: {
            always: [
                {
                    guard: ({ context }) => {
                        const lesson = findLesson(
                            context,
                            context.currentLessonId ?? "",
                        );
                        return (
                            context.currentObjectiveIndex >=
                            (lesson?.objectives.length ?? 0)
                        );
                    },
                    target: "celebrating",
                },
                { target: "active" },
            ],
        },

        celebrating: {
            entry: assign(({ context }) => ({
                completedLessonIds: context.currentLessonId
                    ? [
                          ...new Set([
                              ...context.completedLessonIds,
                              context.currentLessonId,
                          ]),
                      ]
                    : context.completedLessonIds,
            })),
            on: {
                SELECT_LESSON: { target: "loading" },
                CONTINUE: { target: "menu" },
            },
        },
    },
});
