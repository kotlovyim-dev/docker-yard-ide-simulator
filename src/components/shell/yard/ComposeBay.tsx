"use client";
import { LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContainerRecord, ComposeStack } from "@/engine/types";
import { ContainerTile } from "./ContainerTile";

export function ComposeBay({
    stack,
    containers,
}: {
    stack: ComposeStack;
    containers: ContainerRecord[];
}) {
    const runningCount = containers.filter(
        (c) => c.status === "running",
    ).length;
    return (
        <div className="mb-4 rounded-[6px] border-2 border-[hsl(176_80%_45%/0.40)] bg-[hsl(176_80%_45%/0.04)] relative">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[hsl(176_80%_45%/0.25)] bg-[hsl(176_80%_45%/0.07)] rounded-t-[4px]">
                <LayoutGrid size={11} className="text-teal shrink-0" />
                <span className="text-[10px] font-mono font-semibold tracking-widest uppercase text-teal">
                    {stack.name}
                </span>
                <span className="ml-1 text-[9px] font-mono text-yard-dim">
                    compose stack
                </span>
                <Badge
                    variant="outline"
                    className="ml-auto text-[9px] px-1.5 py-0 h-4 rounded-full bg-[hsl(176_80%_45%/0.10)] text-teal border-[hsl(176_80%_45%/0.3)] leading-none"
                >
                    {runningCount}/{containers.length} running
                </Badge>
            </div>
            <div className="p-2">
                {stack.serviceNames.map((svcName, idx) => {
                    const c = containers[idx];
                    return c ? (
                        <ContainerTile key={c.id} c={c} />
                    ) : (
                        <div
                            key={svcName}
                            className="p-3 rounded-[6px] mb-2 border border-dashed border-yard-border text-yard-dim text-xs font-mono"
                        >
                            {svcName} — not started
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
