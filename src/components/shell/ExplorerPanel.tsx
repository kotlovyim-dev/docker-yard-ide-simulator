"use client";
import { useState, useRef } from "react";
import { FileText, Plus, FileCode2, FileJson, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSelector } from "@xstate/react";
import { useMachineContext } from "@/lib/machineContext";
import type { WorkspaceFile } from "@/engine/types";

function fileIcon(lang: WorkspaceFile["language"]) {
    if (lang === "dockerfile") return <FileCode2 size={12} className="shrink-0" />;
    if (lang === "yaml") return <FileJson size={12} className="shrink-0" />;
    return <FileText size={12} className="shrink-0" />;
}

export function ExplorerPanel() {
    const { ideActor } = useMachineContext();

    const files = useSelector(ideActor, (s) => Object.values(s.context.files));
    const activeFilePath = useSelector(ideActor, (s) => s.context.activeFilePath);

    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    function startCreate() {
        setCreating(true);
        setNewName("");
        setTimeout(() => inputRef.current?.focus(), 50);
    }

    function commitCreate() {
        const trimmed = newName.trim();
        if (trimmed) {
            ideActor.send({ type: "CREATE_FILE", path: trimmed, language: "text" });
        }
        setCreating(false);
        setNewName("");
    }

    return (
        <div className="flex flex-col h-full w-full bg-yard-surface border-r border-yard-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-yard-header border-b border-yard-border shrink-0">
                <span className="flex-1 text-[10px] font-semibold tracking-widest uppercase text-yard-muted">
                    Explorer
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={startCreate}
                    className="h-5 w-5 text-yard-muted hover:text-yard-fg hover:bg-transparent"
                >
                    <Plus size={13} />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="py-1">
                    {files.map((file) => (
                        <button
                            key={file.path}
                            onClick={() => ideActor.send({ type: "OPEN_FILE", path: file.path })}
                            className={[
                                "flex items-center gap-2 w-full justify-start px-3 h-7 text-xs font-mono rounded-none transition-colors",
                                activeFilePath === file.path
                                    ? "bg-yard-elevated text-teal"
                                    : "text-yard-muted hover:bg-yard-elevated hover:text-yard-fg",
                            ].join(" ")}
                        >
                            {fileIcon(file.language)}
                            <span className="truncate">{file.path}</span>
                        </button>
                    ))}

                    {creating && (
                        <div className="flex items-center gap-1 px-3 h-7">
                            <FileText size={12} className="text-yard-dim shrink-0" />
                            <input
                                ref={inputRef}
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onBlur={commitCreate}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") commitCreate();
                                    if (e.key === "Escape") setCreating(false);
                                }}
                                className="flex-1 bg-transparent text-xs font-mono text-yard-fg outline-none border-b border-teal min-w-0"
                                placeholder="filename…"
                            />
                            <button
                                onClick={() => setCreating(false)}
                                className="text-yard-dim hover:text-yard-fg"
                            >
                                <X size={11} />
                            </button>
                        </div>
                    )}

                    {files.length === 0 && !creating && (
                        <div className="px-3 py-4 text-[11px] text-yard-dim text-center">
                            No files yet
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
