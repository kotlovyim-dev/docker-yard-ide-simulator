import { Package, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar() {
    return (
        <header className="flex items-center gap-3 px-3 h-10 flex-shrink-0 bg-yard-header border-b border-yard-border">
            <div className="flex items-center gap-2">
                <Package size={14} className="text-teal" />
                <span className="font-mono text-xs font-semibold tracking-widest uppercase text-teal">
                    DOCKER YARD
                </span>
            </div>

            <div className="w-px h-4 bg-yard-border flex-shrink-0" />

            <span className="text-xs flex-1 truncate text-yard-muted">
                Free Play — Sandbox
            </span>

            <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs border-yard-border text-yard-muted bg-transparent hover:bg-transparent hover:border-yard-border-strong hover:text-yard-fg"
            >
                <RotateCcw size={11} />
                Reset
            </Button>
        </header>
    );
}
