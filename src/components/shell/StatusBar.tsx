import { Circle } from "lucide-react";

export function StatusBar() {
    return (
        <footer className="flex items-center gap-4 px-3 h-6 shrink-0 bg-yard-header border-t border-yard-border">
            <div className="flex items-center gap-1.5 text-[11px] text-yard-dim">
                <Circle size={7} className="fill-yard-dim" />
                <span>0 containers</span>
            </div>
            <div className="w-px h-3 bg-yard-border" />
            <div className="flex items-center gap-1.5 text-[11px] text-yard-dim">
                <span>0 errors</span>
            </div>
            <div className="w-px h-3 bg-yard-border" />
            <span className="text-[11px] text-yard-dim flex-1 truncate">
                No active objective
            </span>
        </footer>
    );
}
