"use client";
import { useState } from "react";
import { useSelector } from "@xstate/react";
import { Clock } from "lucide-react";
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
} from "@/components/ui/sheet";
import type { EngineEvent } from "@/engine/types";

type EventStyle = { label: string; className: string };

const EVENT_STYLES: Record<string, EventStyle> = {
    IMAGE_PULL_STARTED: {
        label: "PULL",
        className:
            "bg-[hsl(190_85%_55%/0.12)] text-[hsl(190_85%_55%)] border-[hsl(190_85%_55%/0.35)]",
    },
    IMAGE_PULL_COMPLETE: {
        label: "PULL",
        className:
            "bg-[hsl(190_85%_55%/0.12)] text-[hsl(190_85%_55%)] border-[hsl(190_85%_55%/0.35)]",
    },
    CONTAINER_CREATED: {
        label: "CREATE",
        className:
            "bg-[hsl(176_80%_45%/0.12)] text-teal border-[hsl(176_80%_45%/0.35)]",
    },
    CONTAINER_STARTED: {
        label: "START",
        className:
            "bg-[hsl(162_75%_44%/0.12)] text-[hsl(162_75%_44%)] border-[hsl(162_75%_44%/0.35)]",
    },
    CONTAINER_STOPPED: {
        label: "STOP",
        className:
            "bg-[hsl(38_95%_55%/0.12)] text-[hsl(38_95%_55%)] border-[hsl(38_95%_55%/0.35)]",
    },
    CONTAINER_REMOVED: {
        label: "REMOVE",
        className:
            "bg-[hsl(0_78%_56%/0.12)] text-[hsl(0_78%_56%)] border-[hsl(0_78%_56%/0.35)]",
    },
    BUILD_STEP: {
        label: "BUILD",
        className:
            "bg-[hsl(190_85%_55%/0.12)] text-[hsl(190_85%_55%)] border-[hsl(190_85%_55%/0.35)]",
    },
    BUILD_COMPLETE: {
        label: "BUILD",
        className:
            "bg-[hsl(162_75%_44%/0.12)] text-[hsl(162_75%_44%)] border-[hsl(162_75%_44%/0.35)]",
    },
    BUILD_FAILED: {
        label: "BUILD",
        className:
            "bg-[hsl(0_78%_56%/0.12)] text-[hsl(0_78%_56%)] border-[hsl(0_78%_56%/0.35)]",
    },
    COMPOSE_SERVICE_STARTED: {
        label: "COMPOSE",
        className:
            "bg-[hsl(176_80%_45%/0.12)] text-teal border-[hsl(176_80%_45%/0.35)]",
    },
    COMPOSE_SERVICE_STOPPED: {
        label: "COMPOSE",
        className:
            "bg-[hsl(38_95%_55%/0.12)] text-[hsl(38_95%_55%)] border-[hsl(38_95%_55%/0.35)]",
    },
    COMPOSE_FAILED: {
        label: "COMPOSE",
        className:
            "bg-[hsl(0_78%_56%/0.12)] text-[hsl(0_78%_56%)] border-[hsl(0_78%_56%/0.35)]",
    },
    EXEC_COMMAND_RUN: {
        label: "EXEC",
        className:
            "bg-[hsl(176_80%_45%/0.12)] text-teal border-[hsl(176_80%_45%/0.35)]",
    },
    PORT_BOUND: {
        label: "PORT",
        className:
            "bg-[hsl(190_85%_55%/0.12)] text-[hsl(190_85%_55%)] border-[hsl(190_85%_55%/0.35)]",
    },
    PORT_RELEASED: {
        label: "PORT",
        className:
            "bg-[hsl(38_95%_55%/0.12)] text-[hsl(38_95%_55%)] border-[hsl(38_95%_55%/0.35)]",
    },
};

function formatTimestamp(ts: string): string {
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return "--:--:--";
    return date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function eventSummary(event: EngineEvent): string {
    if (event.humanSummary && event.humanSummary.trim().length > 0) {
        return event.humanSummary;
    }
    return `Event ${event.type}`;
}

function eventStyle(event: EngineEvent): EventStyle {
    return (
        EVENT_STYLES[event.type] ?? {
            label: event.type.replace(/_/g, " "),
            className:
                "bg-[hsl(215_20%_18%/0.6)] text-yard-muted border-yard-border",
        }
    );
}

export function EventLog() {
    const { engineActor } = useMachineContext();
    const [open, setOpen] = useState(false);

    const events = useSelector(engineActor, (s) =>
        [...s.context.eventLog].reverse(),
    );

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs border-yard-border text-yard-muted bg-transparent hover:bg-transparent hover:border-yard-border-strong hover:text-yard-fg"
                >
                    Event Log
                </Button>
            </SheetTrigger>
            <SheetContent
                side="right"
                className="bg-yard-surface border-yard-border text-yard-fg"
            >
                <SheetHeader className="border-b border-yard-border">
                    <SheetTitle className="text-xs font-mono tracking-widest uppercase text-yard-muted">
                        Event Log
                    </SheetTitle>
                    <SheetDescription className="text-[11px] text-yard-dim">
                        Human summaries for every engine event
                    </SheetDescription>
                </SheetHeader>

                {events.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-[11px] text-yard-dim">
                        No events yet
                    </div>
                ) : (
                    <ScrollArea className="flex-1">
                        <div className="divide-y divide-yard-border">
                            {events.map((event) => {
                                const style = eventStyle(event);
                                const payloadText = JSON.stringify(
                                    event.payload ?? {},
                                    null,
                                    2,
                                );
                                return (
                                    <div key={event.id} className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] px-1.5 py-0 h-4 rounded-full leading-none ${style.className}`}
                                            >
                                                {style.label}
                                            </Badge>
                                            <div className="flex items-center gap-1 text-[10px] text-yard-dim font-mono">
                                                <Clock
                                                    size={10}
                                                    className="text-yard-dim"
                                                />
                                                <span>
                                                    {formatTimestamp(
                                                        event.timestamp,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-1 text-[12px] text-yard-muted">
                                            {eventSummary(event)}
                                        </div>
                                        {payloadText !== "{}" && (
                                            <details className="mt-2">
                                                <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-teal">
                                                    Payload
                                                </summary>
                                                <pre className="mt-2 text-[10px] text-yard-dim whitespace-pre-wrap">
                                                    {payloadText}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}
            </SheetContent>
        </Sheet>
    );
}
