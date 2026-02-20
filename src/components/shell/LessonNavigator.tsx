"use client";
import { useState } from "react";
import { useSelector } from "@xstate/react";
import { useMachineContext } from "@/lib/machineContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet";

export function LessonNavigator() {
    const { lessonActor } = useMachineContext();
    const [open, setOpen] = useState(false);

    const lessons = useSelector(lessonActor, (s) => s.context.availableLessons);
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

    const activeLesson = lessons.find((l) => l.id === currentLessonId) ?? null;

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs border-yard-border text-yard-muted bg-transparent hover:bg-transparent hover:border-yard-border-strong hover:text-yard-fg"
                >
                    Lessons
                </Button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="bg-yard-surface border-yard-border text-yard-fg"
            >
                <SheetHeader className="border-b border-yard-border">
                    <SheetTitle className="text-xs font-mono tracking-widest uppercase text-yard-muted">
                        Lesson Navigator
                    </SheetTitle>
                    <SheetDescription className="text-[11px] text-yard-dim">
                        Select a lesson and complete objectives
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-3">
                        {lessons.map((lesson) => {
                            const isActive = lesson.id === currentLessonId;
                            const isCompleted = completedLessonIds.includes(
                                lesson.id,
                            );
                            return (
                                <div
                                    key={lesson.id}
                                    className="border border-yard-border rounded-[6px] p-3 bg-yard-elevated"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-yard-fg">
                                            {lesson.title}
                                        </span>
                                        {isCompleted ? (
                                            <Badge
                                                variant="outline"
                                                className="text-[9px] px-1.5 py-0 h-4 rounded-full bg-[hsl(162_75%_44%/0.12)] text-[hsl(162_75%_44%)] border-[hsl(162_75%_44%/0.3)] leading-none"
                                            >
                                                completed
                                            </Badge>
                                        ) : isActive ? (
                                            <Badge
                                                variant="outline"
                                                className="text-[9px] px-1.5 py-0 h-4 rounded-full bg-[hsl(176_80%_45%/0.10)] text-teal border-[hsl(176_80%_45%/0.3)] leading-none"
                                            >
                                                active
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <p className="text-[11px] text-yard-dim mt-1">
                                        {lesson.description}
                                    </p>
                                    <div className="mt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 px-2 text-[11px] border-yard-border text-yard-muted bg-transparent hover:bg-transparent hover:border-yard-border-strong hover:text-yard-fg"
                                            onClick={() => {
                                                lessonActor.send({
                                                    type: "SELECT_LESSON",
                                                    lessonId: lesson.id,
                                                });
                                                setOpen(false);
                                            }}
                                        >
                                            {isActive ? "Continue" : "Start"}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                <div className="border-t border-yard-border p-4">
                    <div className="text-[11px] text-yard-muted mb-2">
                        Current Objectives
                    </div>
                    {activeLesson ? (
                        <div className="space-y-1">
                            {activeLesson.objectives.map((obj, idx) => {
                                const done = idx < currentObjectiveIndex;
                                return (
                                    <div
                                        key={obj.id}
                                        className="flex items-start gap-2 text-[11px]"
                                    >
                                        <span
                                            className={
                                                done
                                                    ? "text-[hsl(162_75%_44%)]"
                                                    : "text-yard-dim"
                                            }
                                        >
                                            {done ? "[x]" : "[ ]"}
                                        </span>
                                        <span
                                            className={
                                                done
                                                    ? "text-yard-fg"
                                                    : "text-yard-dim"
                                            }
                                        >
                                            {obj.description}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-[11px] text-yard-dim">
                            No active lesson
                        </div>
                    )}
                </div>

                <SheetFooter className="border-t border-yard-border">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs border-yard-border text-yard-muted bg-transparent hover:bg-transparent hover:border-yard-border-strong hover:text-yard-fg"
                            onClick={() => {
                                lessonActor.send({ type: "RESTART_LESSON" });
                                setOpen(false);
                            }}
                            disabled={!currentLessonId}
                        >
                            Restart Lesson
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs border-yard-border text-yard-muted bg-transparent hover:bg-transparent hover:border-yard-border-strong hover:text-yard-fg"
                            onClick={() => {
                                lessonActor.send({ type: "EXIT_TO_MENU" });
                                setOpen(false);
                            }}
                        >
                            Exit
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
