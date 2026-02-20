"use client";
import { Container, Network, Layers } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSelector } from "@xstate/react";
import { useMachineContext } from "@/lib/machineContext";
import type { ContainerRecord } from "@/engine/types";
import { ContainerTile, ComposeBay, ImageSlab } from "./yard";

export function YardPanel() {
    const { engineActor } = useMachineContext();

    const containers = useSelector(engineActor, (s) =>
        Object.values(s.context.containers).filter(
            (c) => c.status !== "removed",
        ),
    );
    const images = useSelector(engineActor, (s) =>
        Object.values(s.context.images),
    );
    const composeStacks = useSelector(engineActor, (s) =>
        Object.values(s.context.composeStacks ?? {}),
    );

    const stackedIds = new Set(
        composeStacks.flatMap((st) => Object.values(st.containerIds)),
    );
    const standaloneContainers = containers.filter(
        (c) => !stackedIds.has(c.id),
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
                        {containers.length} container
                        {containers.length !== 1 ? "s" : ""}
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
                            <span className="ml-1 text-[9px] text-teal">
                                {images.length}
                            </span>
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

                <TabsContent
                    value="yard"
                    className="flex-1 m-0 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle,hsl(215_20%_18%)_1px,transparent_1px)] bg-size-[24px_24px]" />
                    {containers.length === 0 && composeStacks.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2 text-yard-dim">
                                <Container size={36} strokeWidth={1} />
                                <span className="text-xs tracking-wide uppercase">
                                    Empty yard
                                </span>
                                <span className="text-[11px] text-yard-dim">
                                    Pull an image to get started
                                </span>
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="absolute inset-0">
                            <div className="p-3">
                                {composeStacks.map((stack) => {
                                    const stackContainers = stack.serviceNames
                                        .map((svc) => {
                                            const cid = stack.containerIds[svc];
                                            return cid
                                                ? (containers.find(
                                                      (c) => c.id === cid,
                                                  ) ?? null)
                                                : null;
                                        })
                                        .filter(
                                            (c): c is ContainerRecord =>
                                                c !== null,
                                        );
                                    return (
                                        <ComposeBay
                                            key={stack.name}
                                            stack={stack}
                                            containers={stackContainers}
                                        />
                                    );
                                })}
                                {standaloneContainers.map((c) => (
                                    <ContainerTile key={c.id} c={c} />
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </TabsContent>

                <TabsContent
                    value="layers"
                    className="flex-1 m-0 overflow-hidden"
                >
                    {images.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="flex flex-col items-center gap-2 text-yard-dim">
                                <Layers size={32} strokeWidth={1} />
                                <span className="text-xs">
                                    No images — try docker pull nginx
                                </span>
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

                <TabsContent
                    value="networks"
                    className="flex-1 m-0 flex items-center justify-center"
                >
                    <div className="flex flex-col items-center gap-2 text-yard-dim">
                        <Network size={32} strokeWidth={1} />
                        <span className="text-xs">No networks</span>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
