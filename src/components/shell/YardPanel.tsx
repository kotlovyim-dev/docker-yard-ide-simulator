"use client";
import { Container, Network, Layers, Box } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSelector } from "@xstate/react";
import { useMachineContext } from "@/lib/machineContext";
import type { ContainerRecord, ImageRecord } from "@/engine/types";

function formatSize(bytes: number): string {
    if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
    return `${(bytes / 1_000).toFixed(0)} KB`;
}

function ContainerTile({ c }: { c: ContainerRecord }) {
    const isRunning = c.status === "running";
    const isStopped = c.status === "stopped" || c.status === "created";
    return (
        <div
            className={[
                "p-3 rounded-[6px] mb-2 relative",
                isRunning
                    ? "border-2 border-teal [box-shadow:0_0_12px_0_hsl(176_80%_45%_/_0.10)]"
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
                            ? "bg-[hsl(162_75%_44%_/_0.15)] text-[hsl(162_75%_44%)] border-[hsl(162_75%_44%_/_0.3)]"
                            : isStopped
                                ? "bg-transparent text-yard-dim border-yard-border"
                                : "bg-[hsl(0_78%_56%_/_0.15)] text-[hsl(0_78%_56%)] border-[hsl(0_78%_56%_/_0.3)]",
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
                            {p.hostPort} → {p.containerPort}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function ImageSlab({ img }: { img: ImageRecord }) {
    const shortId = img.id.replace("sha256:", "").substring(0, 12);
    return (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-yard-border hover:bg-yard-elevated">
            <Box size={13} className="text-teal shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-yard-fg truncate">
                    {img.repository}<span className="text-yard-dim">:{img.tag}</span>
                </div>
                <div className="text-[10px] font-mono text-yard-dim">{shortId}</div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
                <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 rounded-full bg-[hsl(176_80%_45%_/_0.10)] text-teal border-[hsl(176_80%_45%_/_0.3)] leading-none"
                >
                    PULLED
                </Badge>
                <span className="text-[10px] text-yard-dim">{formatSize(img.size)}</span>
            </div>
        </div>
    );
}

export function YardPanel() {
    const { engineActor } = useMachineContext();

    const containers = useSelector(engineActor, (s) =>
        Object.values(s.context.containers).filter((c) => c.status !== "removed")
    );
    const images = useSelector(engineActor, (s) =>
        Object.values(s.context.images)
    );

    return (
        <div className="flex flex-col h-full w-full bg-yard-surface">
            <div className="flex items-center gap-2 px-3 py-2 bg-yard-header border-b border-yard-border shrink-0">
                <Container size={13} className="text-yard-muted" />
                <span className="text-[10px] font-semibold tracking-widest uppercase text-yard-muted">
                    Yard
                </span>
                {containers.length > 0 && (
                    <span className="ml-auto text-[10px] font-mono text-yard-dim">
                        {containers.length} container{containers.length !== 1 ? "s" : ""}
                    </span>
                )}
            </div>

            <Tabs defaultValue="yard" className="flex flex-col flex-1 min-h-0">
                <TabsList className="h-8 rounded-none bg-yard-surface border-b border-yard-border gap-0 grid grid-cols-3 shrink-0 p-0">
                    <TabsTrigger
                        value="yard"
                        className="h-full rounded-none text-xs flex-1 data-[state=active]:text-teal data-[state=active]:border-b-2 data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=inactive]:text-yard-muted data-[state=inactive]:bg-transparent"
                    >
                        <Container size={11} className="mr-1.5" />
                        Yard
                    </TabsTrigger>
                    <TabsTrigger
                        value="layers"
                        className="h-full rounded-none text-xs flex-1 data-[state=active]:text-teal data-[state=active]:border-b-2 data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=inactive]:text-yard-muted data-[state=inactive]:bg-transparent"
                    >
                        <Layers size={11} className="mr-1.5" />
                        Layers
                        {images.length > 0 && (
                            <span className="ml-1 text-[9px] text-teal">{images.length}</span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="networks"
                        className="h-full rounded-none text-xs flex-1 data-[state=active]:text-teal data-[state=active]:border-b-2 data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=inactive]:text-yard-muted data-[state=inactive]:bg-transparent"
                    >
                        <Network size={11} className="mr-1.5" />
                        Networks
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="yard" className="flex-1 m-0 relative overflow-hidden">
                    <div className="absolute inset-0 [background-image:radial-gradient(circle,hsl(215_20%_18%)_1px,transparent_1px)] [background-size:24px_24px]" />
                    {containers.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2 text-yard-dim">
                                <Container size={36} strokeWidth={1} />
                                <span className="text-xs tracking-wide uppercase">Empty yard</span>
                                <span className="text-[11px] text-yard-dim">Pull an image to get started</span>
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="absolute inset-0">
                            <div className="p-3">
                                {containers.map((c) => (
                                    <ContainerTile key={c.id} c={c} />
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </TabsContent>

                <TabsContent value="layers" className="flex-1 m-0 overflow-hidden">
                    {images.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="flex flex-col items-center gap-2 text-yard-dim">
                                <Layers size={32} strokeWidth={1} />
                                <span className="text-xs">No images — try docker pull nginx</span>
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            {images.map((img) => (
                                <ImageSlab key={img.id} img={img} />
                            ))}
                        </ScrollArea>
                    )}
                </TabsContent>

                <TabsContent value="networks" className="flex-1 m-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-yard-dim">
                        <Network size={32} strokeWidth={1} />
                        <span className="text-xs">No networks</span>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
