import { Container, Network, Layers } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function YardPanel() {
    return (
        <div className="flex flex-col h-full w-[340px] shrink-0 bg-yard-surface">
            <div className="flex items-center gap-2 px-3 py-2 bg-yard-header border-b border-yard-border shrink-0">
                <Container size={13} className="text-yard-muted" />
                <span className="text-[10px] font-semibold tracking-widest uppercase text-yard-muted">
                    Yard
                </span>
            </div>

            <Tabs defaultValue="yard" className="flex flex-col flex-1 min-h-0">
                <TabsList className="h-8 rounded-none bg-yard-surface border-b border-yard-border px-2 gap-0 justify-start shrink-0">
                    <TabsTrigger
                        value="yard"
                        className="h-full rounded-none text-xs px-3 data-[state=active]:text-teal data-[state=active]:border-b-2 data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=inactive]:text-yard-muted data-[state=inactive]:bg-transparent"
                    >
                        <Container size={11} className="mr-1.5" />
                        Yard
                    </TabsTrigger>
                    <TabsTrigger
                        value="layers"
                        className="h-full rounded-none text-xs px-3 data-[state=active]:text-teal data-[state=active]:border-b-2 data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=inactive]:text-yard-muted data-[state=inactive]:bg-transparent"
                    >
                        <Layers size={11} className="mr-1.5" />
                        Layers
                    </TabsTrigger>
                    <TabsTrigger
                        value="networks"
                        className="h-full rounded-none text-xs px-3 data-[state=active]:text-teal data-[state=active]:border-b-2 data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=inactive]:text-yard-muted data-[state=inactive]:bg-transparent"
                    >
                        <Network size={11} className="mr-1.5" />
                        Networks
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="yard" className="flex-1 m-0 relative overflow-hidden">
                    <div className="absolute inset-0 [background-image:radial-gradient(circle,hsl(215_20%_18%)_1px,transparent_1px)] [background-size:24px_24px]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-yard-dim">
                            <Container size={36} strokeWidth={1} />
                            <span className="text-xs tracking-wide uppercase">Empty yard</span>
                            <span className="text-[11px] text-yard-dim">Pull an image to get started</span>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="layers" className="flex-1 m-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-yard-dim">
                        <Layers size={32} strokeWidth={1} />
                        <span className="text-xs">No image selected</span>
                    </div>
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
