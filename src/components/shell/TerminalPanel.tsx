import { Terminal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function TerminalPanel() {
    return (
        <div className="flex flex-col shrink-0 bg-yard-bg border-t border-yard-border [box-shadow:0_0_28px_0_hsl(176_80%_45%_/_0.22)]">
            <div className="flex items-center gap-2 px-3 py-2 bg-yard-header border-b border-yard-border shrink-0">
                <Terminal size={13} className="text-yard-muted" />
                <span className="text-[10px] font-semibold tracking-widest uppercase text-yard-muted">
                    Terminal
                </span>
            </div>

            <Tabs defaultValue="terminal-1" className="flex flex-col flex-1 min-h-0">
                <TabsList className="h-8 rounded-none bg-yard-surface border-b border-yard-border px-2 gap-0 justify-start shrink-0">
                    <TabsTrigger
                        value="terminal-1"
                        className="h-full rounded-none text-xs px-3 data-[state=active]:text-teal data-[state=active]:border-b-2 data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=inactive]:text-yard-muted data-[state=inactive]:bg-transparent"
                    >
                        <Terminal size={11} className="mr-1.5" />
                        terminal 1
                    </TabsTrigger>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-yard-muted hover:text-yard-fg hover:bg-transparent">
                        <Plus size={11} />
                    </Button>
                </TabsList>

                <TabsContent value="terminal-1" className="flex-1 m-0 p-3 overflow-auto h-40">
                    <div className="font-mono text-sm leading-relaxed">
                        <div className="text-yard-muted">
                            <span className="text-yard-dim">yard:/project</span>
                            <span className="text-teal">$</span>
                            <span className="ml-2 text-yard-fg opacity-60">_</span>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
