import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const placeholderFiles = [
    { name: "Dockerfile" },
    { name: "compose.yml" },
    { name: ".env" },
];

export function ExplorerPanel() {
    return (
        <div className="flex flex-col h-full w-[200px] shrink-0 bg-yard-surface border-r border-yard-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-yard-header border-b border-yard-border shrink-0">
                <span className="flex-1 text-[10px] font-semibold tracking-widest uppercase text-yard-muted">
                    Explorer
                </span>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-yard-muted hover:text-yard-fg hover:bg-transparent">
                    <Plus size={13} />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="py-1">
                    {placeholderFiles.map((file) => (
                        <Button
                            key={file.name}
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-2 w-full justify-start px-3 h-7 text-xs font-mono text-yard-muted hover:bg-yard-elevated hover:text-yard-fg rounded-none"
                        >
                            <FileText size={12} />
                            {file.name}
                        </Button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
