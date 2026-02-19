import { FileCode2, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export function EditorPanel() {
    return (
        <div className="flex flex-col flex-1 min-w-0 bg-yard-surface border-r border-yard-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-yard-header border-b border-yard-border shrink-0">
                <FileCode2 size={13} className="text-yard-muted" />
                <span className="text-[10px] font-semibold tracking-widest uppercase text-yard-muted">
                    Editor
                </span>
            </div>

            <div className="flex items-center px-3 h-8 border-b border-yard-border bg-yard-surface shrink-0">
                <span className="text-xs text-yard-dim font-mono italic">
                    No file open
                </span>
            </div>

            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-yard-dim">
                    <FileCode2 size={32} strokeWidth={1} />
                    <span className="text-xs">Select a file from the explorer</span>
                </div>
            </div>

            <div className="shrink-0 border-t border-yard-border">
                <div className="flex items-center gap-2 px-3 py-2 bg-yard-header border-b border-yard-border">
                    <AlertTriangle size={12} className="text-yard-muted" />
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-yard-muted flex-1">
                        Problems
                    </span>
                    <span className="text-[10px] text-yard-dim">0 errors · 0 warnings</span>
                </div>
                <ScrollArea className="h-16">
                    <div className="px-3 py-2 text-xs text-yard-dim">
                        No diagnostics.
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
