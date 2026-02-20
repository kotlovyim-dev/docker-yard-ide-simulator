"use client";
import { useMemo } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMachineContext } from "@/lib/machineContext";

export function SessionRestorePrompt() {
    const { sessionStatus, storedSession, restoreSession, discardSession } =
        useMachineContext();

    const summary = useMemo(() => {
        if (!storedSession) return null;
        const fileCount = Object.keys(storedSession.workspace.files).length;
        const containerCount = Object.values(
            storedSession.engine.containers,
        ).filter((c) => c.status !== "removed").length;
        const imageCount = Object.keys(storedSession.engine.images).length;
        const savedAt = new Date(storedSession.savedAt).toLocaleString();
        return { fileCount, containerCount, imageCount, savedAt };
    }, [storedSession]);

    if (sessionStatus !== "prompt" || !storedSession || !summary) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-[min(92vw,420px)] rounded-lg border border-yard-border bg-yard-surface shadow-xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-yard-border bg-yard-header">
                    <Clock size={14} className="text-teal" />
                    <span className="text-xs font-semibold tracking-widest uppercase text-yard-muted">
                        Restore Session
                    </span>
                </div>
                <div className="px-4 py-4 space-y-3">
                    <p className="text-sm text-yard-fg">
                        We found a previous session. Restore your workspace and
                        engine state?
                    </p>
                    <div className="text-xs text-yard-dim space-y-1">
                        <div>Saved: {summary.savedAt}</div>
                        <div>
                            {summary.fileCount} file
                            {summary.fileCount !== 1 ? "s" : ""} ·{" "}
                            {summary.imageCount} image
                            {summary.imageCount !== 1 ? "s" : ""} ·{" "}
                            {summary.containerCount} container
                            {summary.containerCount !== 1 ? "s" : ""}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-yard-border bg-yard-header">
                    <Button variant="ghost" size="sm" onClick={discardSession}>
                        Start fresh
                    </Button>
                    <Button size="sm" onClick={restoreSession}>
                        Restore
                    </Button>
                </div>
            </div>
        </div>
    );
}
