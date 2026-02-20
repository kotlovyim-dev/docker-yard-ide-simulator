"use client";
import { Badge } from "@/components/ui/badge";
import type { ContainerRecord } from "@/engine/types";

export function ContainerTile({ c }: { c: ContainerRecord }) {
    const isRunning = c.status === "running";
    const isStopped = c.status === "stopped" || c.status === "created";
    return (
        <div
            className={[
                "p-3 rounded-[6px] mb-2 relative",
                isRunning
                    ? "border-2 border-teal [box-shadow:0_0_12px_0_hsl(176_80%_45%/0.10)]"
                    : isStopped
                      ? "border border-dashed border-yard-border"
                      : "border-2 border-[hsl(0_78%_56%)]",
            ].join(" ")}
        >
            <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-mono font-semibold tracking-widest uppercase text-yard-fg leading-tight">
                    {c.name}
                </span>
                <Badge
                    className={[
                        "text-[9px] px-1.5 py-0 h-4 rounded-full leading-none shrink-0",
                        isRunning
                            ? "bg-[hsl(162_75%_44%/0.15)] text-[hsl(162_75%_44%)] border-[hsl(162_75%_44%/0.3)]"
                            : isStopped
                              ? "bg-transparent text-yard-dim border-yard-border"
                              : "bg-[hsl(0_78%_56%/0.15)] text-[hsl(0_78%_56%)] border-[hsl(0_78%_56%/0.3)]",
                    ].join(" ")}
                    variant="outline"
                >
                    {c.status.toUpperCase()}
                </Badge>
            </div>
            <div className="text-[10px] font-mono text-yard-dim mb-1.5">
                {c.id.substring(0, 12)}
            </div>
            {c.ports.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {c.ports.map((p, i) => (
                        <span
                            key={i}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-yard-elevated text-yard-dim border border-yard-border"
                        >
                            {p.hostPort} → {p.containerPort}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
