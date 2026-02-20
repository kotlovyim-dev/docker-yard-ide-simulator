"use client";
import { Box } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ImageRecord } from "@/engine/types";

function formatSize(bytes: number): string {
    if (bytes >= 1_000_000_000)
        return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
    return `${(bytes / 1_000).toFixed(0)} KB`;
}

export function ImageSlab({ img }: { img: ImageRecord }) {
    const shortId = img.id.replace("sha256:", "").substring(0, 12);
    return (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-yard-border hover:bg-yard-elevated">
            <Box size={13} className="text-teal shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-yard-fg truncate">
                    {img.repository}
                    <span className="text-yard-dim">:{img.tag}</span>
                </div>
                <div className="text-[10px] font-mono text-yard-dim">
                    {shortId}
                </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
                <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 rounded-full bg-[hsl(176_80%_45%/0.10)] text-teal border-[hsl(176_80%_45%/0.3)] leading-none"
                >
                    PULLED
                </Badge>
                <span className="text-[10px] text-yard-dim">
                    {formatSize(img.size)}
                </span>
            </div>
        </div>
    );
}
