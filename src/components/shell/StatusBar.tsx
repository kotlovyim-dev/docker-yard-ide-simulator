"use client";
import { Circle } from "lucide-react";
import { useSelector } from "@xstate/react";
import { useMachineContext } from "@/lib/machineContext";

export function StatusBar() {
    const { engineActor, ideActor } = useMachineContext();

    const containerCount = useSelector(engineActor, (s) =>
        Object.values(s.context.containers).filter(
            (c) => c.status !== "removed"
        ).length
    );

    const errorCount = useSelector(ideActor, (s) =>
        Object.values(s.context.diagnostics)
            .flat()
            .filter((d) => d.severity === "error").length
    );

    return (
        <footer className="flex items-center gap-4 px-3 h-6 shrink-0 bg-yard-header border-t border-yard-border">
            <div className="flex items-center gap-1.5 text-[11px] text-yard-dim">
                <Circle
                    size={7}
                    className={
                        containerCount > 0
                            ? "fill-[hsl(162_75%_44%)] text-[hsl(162_75%_44%)]"
                            : "fill-yard-dim"
                    }
                />
                <span>
                    {containerCount} container{containerCount !== 1 ? "s" : ""}
                </span>
            </div>
            <div className="w-px h-3 bg-yard-border" />
            <div className="flex items-center gap-1.5 text-[11px]">
                <span className={errorCount > 0 ? "text-[hsl(0_78%_56%)]" : "text-yard-dim"}>
                    {errorCount} error{errorCount !== 1 ? "s" : ""}
                </span>
            </div>
            <div className="w-px h-3 bg-yard-border" />
            <span className="text-[11px] text-yard-dim flex-1 truncate">
                No active objective
            </span>
        </footer>
    );
}
