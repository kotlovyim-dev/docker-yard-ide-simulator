"use client";
import { useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { FileCode2, AlertTriangle, AlertCircle, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSelector } from "@xstate/react";
import { useMachineContext } from "@/lib/machineContext";
import type { Diagnostic } from "@/engine/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
    ssr: false,
});

function monacoLanguage(lang: string): string {
    if (lang === "dockerfile") return "dockerfile";
    if (lang === "yaml") return "yaml";
    if (lang === "javascript") return "javascript";
    if (lang === "sh") return "shell";
    return "plaintext";
}

function DiagnosticRow({ d }: { d: Diagnostic }) {
    const isError = d.severity === "error";
    return (
        <div className="flex items-start gap-2 px-3 py-1 hover:bg-yard-elevated">
            {isError ? (
                <AlertCircle
                    size={11}
                    className="text-[hsl(0_78%_56%)] mt-0.5 shrink-0"
                />
            ) : (
                <AlertTriangle
                    size={11}
                    className="text-[hsl(38_95%_55%)] mt-0.5 shrink-0"
                />
            )}
            <span
                className={[
                    "text-[11px] font-mono leading-tight",
                    isError
                        ? "text-[hsl(0_78%_56%)]"
                        : "text-[hsl(38_95%_55%)]",
                ].join(" ")}
            >
                [{d.ruleId}] {d.message}
            </span>
            <span className="ml-auto text-[10px] text-yard-dim shrink-0">
                L{d.line}
            </span>
        </div>
    );
}

export function EditorPanel() {
    const { ideActor } = useMachineContext();

    const openTabs = useSelector(ideActor, (s) => s.context.openTabs);
    const activeFilePath = useSelector(
        ideActor,
        (s) => s.context.activeFilePath,
    );
    const files = useSelector(ideActor, (s) => s.context.files);
    const diagnostics = useSelector(ideActor, (s) =>
        activeFilePath ? (s.context.diagnostics[activeFilePath] ?? []) : [],
    );
    const allDiagnostics = useSelector(ideActor, (s) =>
        Object.values(s.context.diagnostics).flat(),
    );

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleEditorMount = useCallback(() => {
        ideActor.send({ type: "EDITOR_READY" });
    }, [ideActor]);

    const handleChange = useCallback(
        (value: string | undefined) => {
            if (!activeFilePath) return;
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                ideActor.send({
                    type: "UPDATE_FILE_CONTENT",
                    path: activeFilePath,
                    content: value ?? "",
                });
            }, 300);
        },
        [activeFilePath, ideActor],
    );

    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    const activeFile = activeFilePath ? files[activeFilePath] : null;
    const errorCount = allDiagnostics.filter(
        (d) => d.severity === "error",
    ).length;
    const warnCount = allDiagnostics.filter(
        (d) => d.severity === "warning",
    ).length;

    return (
        <div className="flex flex-col flex-1 min-w-0 bg-yard-surface border-r border-yard-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-yard-header border-b border-yard-border shrink-0">
                <FileCode2 size={13} className="text-yard-muted" />
                <span className="text-[10px] font-semibold tracking-widest uppercase text-yard-muted">
                    Editor
                </span>
            </div>

            <div className="flex items-center border-b border-yard-border bg-yard-surface shrink-0 h-8 overflow-x-auto">
                {openTabs.length === 0 ? (
                    <span className="px-3 text-xs text-yard-dim font-mono italic">
                        No file open
                    </span>
                ) : (
                    openTabs.map((path) => (
                        <button
                            key={path}
                            onClick={() =>
                                ideActor.send({ type: "OPEN_FILE", path })
                            }
                            className={[
                                "flex items-center gap-1.5 px-3 h-full text-xs font-mono border-r border-yard-border shrink-0 transition-colors",
                                activeFilePath === path
                                    ? "text-teal border-b-2 border-b-teal bg-yard-elevated"
                                    : "text-yard-muted hover:text-yard-fg",
                            ].join(" ")}
                        >
                            <span className="truncate max-w-30">
                                {path.split("/").pop()}
                            </span>
                            <span
                                role="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    ideActor.send({ type: "CLOSE_TAB", path });
                                }}
                                className="text-yard-dim hover:text-yard-fg ml-0.5"
                            >
                                <X size={10} />
                            </span>
                        </button>
                    ))
                )}
            </div>

            <div className="flex-1 min-h-0 relative">
                {activeFile ? (
                    <MonacoEditor
                        height="100%"
                        language={monacoLanguage(activeFile.language)}
                        value={activeFile.content}
                        onChange={handleChange}
                        onMount={handleEditorMount}
                        theme="vs-dark"
                        options={{
                            fontSize: 13,
                            fontFamily:
                                "var(--font-mono), 'JetBrains Mono', monospace",
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            lineNumbersMinChars: 3,
                            padding: { top: 8, bottom: 8 },
                            renderLineHighlight: "none",
                            overviewRulerBorder: false,
                            hideCursorInOverviewRuler: true,
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-yard-dim">
                            <FileCode2 size={32} strokeWidth={1} />
                            <span className="text-xs">
                                Select a file from the explorer
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="shrink-0 border-t border-yard-border">
                <div className="flex items-center gap-2 px-3 py-2 bg-yard-header border-b border-yard-border">
                    <AlertTriangle size={12} className="text-yard-muted" />
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-yard-muted flex-1">
                        Problems
                    </span>
                    <span className="text-[10px] text-yard-dim">
                        {errorCount > 0 && (
                            <span className="text-[hsl(0_78%_56%)] mr-1">
                                {errorCount} error{errorCount !== 1 ? "s" : ""}
                            </span>
                        )}
                        {warnCount > 0 && (
                            <span className="text-[hsl(38_95%_55%)]">
                                {warnCount} warning{warnCount !== 1 ? "s" : ""}
                            </span>
                        )}
                        {errorCount === 0 &&
                            warnCount === 0 &&
                            "0 errors · 0 warnings"}
                    </span>
                </div>
                <ScrollArea className="h-20">
                    {diagnostics.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-yard-dim">
                            No diagnostics.
                        </div>
                    ) : (
                        diagnostics.map((d, i) => (
                            <DiagnosticRow key={i} d={d} />
                        ))
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}
