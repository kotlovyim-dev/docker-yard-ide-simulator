"use client";
import { useEffect, useRef, useState } from "react";
import type { Terminal as XTerminal } from "xterm";
import type { FitAddon } from "xterm-addon-fit";
import { useMachine } from "@xstate/react";
import { Terminal as TerminalIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { terminalMachine } from "@/machines/terminalMachine";
import { useMachineContext, makeGetWorkspace } from "@/lib/machineContext";
import "xterm/css/xterm.css";

const PROMPT = "\x1b[2m yard:/project \x1b[0m\x1b[36m$\x1b[0m ";

export function TerminalPanel() {
    const { engineActor, ideActor, lessonActor } = useMachineContext();
    const getWorkspace = makeGetWorkspace(ideActor);

    const [state, send] = useMachine(terminalMachine, {
        input: { engineActor, getWorkspace },
    });
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<XTerminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    const lastPrintedIndex = useRef(0);
    const lastCommandSequence = useRef(0);
    const [explainItems, setExplainItems] = useState<string[]>([]);

    useEffect(() => {
        if (!containerRef.current || terminalRef.current) return;

        (async () => {
            const { Terminal: XTerminal } = await import("xterm");
            const { FitAddon } = await import("xterm-addon-fit");
            const { WebLinksAddon } = await import("xterm-addon-web-links");

            const term = new XTerminal({
                cursorBlink: true,
                fontSize: 14,
                fontFamily: "var(--font-mono), monospace",
                theme: {
                    background: "#0B0F14",
                    foreground: "#E6EDF5",
                    cursor: "#20D6C6",
                    selectionBackground: "rgba(32, 214, 198, 0.16)",
                },
                allowProposedApi: true,
                convertEol: true,
            });

            const fitAddon = new FitAddon();
            const webLinksAddon = new WebLinksAddon();

            term.loadAddon(fitAddon);
            term.loadAddon(webLinksAddon);

            if (containerRef.current) {
                term.open(containerRef.current);
                fitAddon.fit();
            }

            terminalRef.current = term;
            fitAddonRef.current = fitAddon;

            term.onKey(({ key, domEvent }) => {
                const ev = domEvent;
                const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

                if (ev.key === "Enter") {
                    send({ type: "ENTER_PRESSED" });
                } else if (ev.key === "Backspace") {
                    send({ type: "KEY_INPUT", key: "Backspace" });
                } else if (ev.key === "ArrowUp") {
                    send({ type: "HISTORY_UP" });
                } else if (ev.key === "ArrowDown") {
                    send({ type: "HISTORY_DOWN" });
                } else if (printable && key.length === 1) {
                    send({ type: "KEY_INPUT", key: key });
                }
            });

            term.write(PROMPT);

            const resizeObserver = new ResizeObserver(() => {
                fitAddon.fit();
            });
            if (containerRef.current) {
                resizeObserver.observe(containerRef.current);
            }
        })();
        return () => {
            const term = terminalRef.current;
            if (term) {
                term.dispose();
                terminalRef.current = null;
            }
        };
    }, [send]);

    useEffect(() => {
        const term = terminalRef.current;
        if (!term) return;

        const lines = state.context.outputLines;
        const start = lastPrintedIndex.current;

        if (lines.length > start) {
            term.write("\x1b[2K\r");

            const newLines = lines.slice(start);
            const newExplains: string[] = [];
            newLines.forEach((line: { text: string; kind: string }) => {
                if (line.text.trimStart().startsWith("Explain:")) {
                    newExplains.push(line.text.replace(/^\s*Explain:\s*/, ""));
                    return;
                }
                let formatted = line.text;
                if (line.kind === "error") {
                    formatted = `\x1b[31m${line.text}\x1b[0m`;
                } else if (line.kind === "success") {
                    formatted = `\x1b[32m${line.text}\x1b[0m`;
                } else if (line.kind === "info") {
                    formatted = `\x1b[33m${line.text}\x1b[0m`;
                }
                term.writeln(formatted);
            });
            if (newExplains.length > 0) {
                setExplainItems((prev) => [...prev, ...newExplains]);
            }
            lastPrintedIndex.current = lines.length;
        }
        term.write(`\x1b[2K\r${PROMPT}${state.context.inputBuffer}`);
    }, [state.context.outputLines, state.context.inputBuffer]);

    useEffect(() => {
        if (state.context.isRunning) {
            setExplainItems([]);
        }
    }, [state.context.isRunning]);

    useEffect(() => {
        const sequence = state.context.commandSequence;
        if (sequence === lastCommandSequence.current) return;
        lastCommandSequence.current = sequence;
        const snapshot = engineActor.getSnapshot().context;
        lessonActor.send({
            type: "CHECK_OBJECTIVES",
            engineSnapshot: snapshot,
        });
    }, [state.context.commandSequence, engineActor, lessonActor]);

    return (
        <div className="flex flex-col h-full bg-yard-surface border-t border-yard-border terminal-glow">
            <div className="flex items-center gap-2 px-3 py-2 bg-yard-header border-b border-yard-border shrink-0">
                <TerminalIcon size={13} className="text-yard-muted" />
                <span className="text-[10px] font-semibold tracking-widest uppercase text-yard-muted">
                    Terminal
                </span>
            </div>

            <Tabs
                defaultValue="terminal-1"
                className="flex flex-col flex-1 min-h-0"
            >
                <TabsList className="h-8 rounded-none bg-yard-surface border-b border-yard-border px-2 gap-0 justify-start shrink-0">
                    <TabsTrigger
                        value="terminal-1"
                        className="h-full rounded-none text-xs px-3 data-[state=active]:text-teal data-[state=active]:border-b-2 data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=inactive]:text-yard-muted data-[state=inactive]:bg-transparent"
                    >
                        <TerminalIcon size={11} className="mr-1.5" />
                        terminal 1
                    </TabsTrigger>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-1 text-yard-muted hover:text-yard-fg hover:bg-transparent"
                    >
                        <Plus size={11} />
                    </Button>
                </TabsList>

                <TabsContent
                    value="terminal-1"
                    className="flex-1 m-0 p-0 relative min-h-0 bg-yard-surface"
                >
                    <div className="flex flex-col h-full min-h-0">
                        <div
                            ref={containerRef}
                            className="flex-1 min-h-0 w-full bg-yard-bg [padding-left:12px;padding-top:8px]"
                        />
                        {explainItems.length > 0 && (
                            <div className="border-t border-yard-border bg-yard-surface px-3 py-2">
                                <details className="group">
                                    <summary className="cursor-pointer text-[10px] font-semibold tracking-widest uppercase text-teal">
                                        Explain
                                    </summary>
                                    <div className="mt-2 space-y-1 text-[11px] text-yard-dim">
                                        {explainItems.map((item, idx) => (
                                            <p key={`${idx}-${item}`}>{item}</p>
                                        ))}
                                    </div>
                                </details>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
