"use client";
import { Package, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelector } from "@xstate/react";
import { useMachineContext } from "@/lib/machineContext";
import { buildEngineSnapshot } from "@/lib/lessonUtils";
import { LessonNavigator } from "./LessonNavigator";

export function TopBar() {
    const { engineActor, ideActor, lessonActor } = useMachineContext();

    const currentLessonId = useSelector(
        lessonActor,
        (s) => s.context.currentLessonId,
    );
    const availableLessons = useSelector(
        lessonActor,
        (s) => s.context.availableLessons,
    );
    const scenarioSnapshot = useSelector(
        lessonActor,
        (s) => s.context.scenarioSnapshot,
    );

    const activeLesson = availableLessons.find((l) => l.id === currentLessonId);

    function handleReset() {
        if (scenarioSnapshot) {
            engineActor.send({
                type: "RESET_TO_SNAPSHOT",
                snapshot: buildEngineSnapshot(scenarioSnapshot),
            });
            ideActor.send({
                type: "RESET_WORKSPACE",
                files: scenarioSnapshot.files,
            });
            return;
        }

        engineActor.send({
            type: "RESET_TO_SNAPSHOT",
            snapshot: {
                images: {},
                containers: {},
                networks: {},
                volumes: {},
                composeStacks: {},
                eventLog: [],
                boundPorts: {},
                pendingCommand: null,
                lastError: null,
            },
        });
        ideActor.send({ type: "RESET_WORKSPACE", files: {} });
    }

    return (
        <header className="flex items-center gap-3 px-3 h-10 shrink-0 bg-yard-header border-b border-yard-border">
            <div className="flex items-center gap-2">
                <Package size={14} className="text-teal" />
                <span className="font-mono text-xs font-semibold tracking-widest uppercase text-teal">
                    DOCKER YARD
                </span>
            </div>

            <div className="w-px h-4 bg-yard-border shrink-0" />

            <span className="text-xs flex-1 truncate text-yard-muted">
                {activeLesson ? activeLesson.title : "Free Play - Sandbox"}
            </span>

            <LessonNavigator />

            <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs border-yard-border text-yard-muted bg-transparent hover:bg-transparent hover:border-yard-border-strong hover:text-yard-fg"
                onClick={handleReset}
            >
                <RotateCcw size={11} />
                Reset
            </Button>
        </header>
    );
}
