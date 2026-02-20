"use client";
import { useEffect, useRef } from "react";
import { useSelector } from "@xstate/react";
import { useMachineContext } from "@/lib/machineContext";
import { buildEngineSnapshot } from "@/lib/lessonUtils";
import { saveLessonProgress } from "@/lib/lessonStorage";

export function LessonBridge() {
    const { engineActor, ideActor, lessonActor, lessonHydrated } =
        useMachineContext();

    const lessonState = useSelector(lessonActor, (s) => s.value);
    const currentLessonId = useSelector(
        lessonActor,
        (s) => s.context.currentLessonId,
    );
    const currentObjectiveIndex = useSelector(
        lessonActor,
        (s) => s.context.currentObjectiveIndex,
    );
    const completedLessonIds = useSelector(
        lessonActor,
        (s) => s.context.completedLessonIds,
    );
    const scenarioSnapshot = useSelector(
        lessonActor,
        (s) => s.context.scenarioSnapshot,
    );

    const lastAppliedLessonId = useRef<string | null>(null);
    const lastAppliedSnapshot = useRef<object | null>(null);

    useEffect(() => {
        if (lessonState !== "active") return;
        if (!scenarioSnapshot) return;

        if (
            lastAppliedLessonId.current === currentLessonId &&
            lastAppliedSnapshot.current === scenarioSnapshot
        ) {
            return;
        }

        lastAppliedLessonId.current = currentLessonId;
        lastAppliedSnapshot.current = scenarioSnapshot;

        engineActor.send({
            type: "RESET_TO_SNAPSHOT",
            snapshot: buildEngineSnapshot(scenarioSnapshot),
        });

        ideActor.send({
            type: "RESET_WORKSPACE",
            files: scenarioSnapshot.files,
        });
    }, [lessonState, scenarioSnapshot, currentLessonId, engineActor, ideActor]);

    useEffect(() => {
        if (!lessonHydrated) return;
        saveLessonProgress({
            currentLessonId,
            currentObjectiveIndex,
            completedLessonIds,
        });
    }, [lessonHydrated, currentLessonId, currentObjectiveIndex, completedLessonIds]);

    return null;
}
