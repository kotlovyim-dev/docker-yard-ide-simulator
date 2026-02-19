"use client";
import { useEffect, useRef } from "react";
import type { Terminal as XTerminal } from "xterm";
import type { FitAddon } from "xterm-addon-fit";
import { useMachine } from "@xstate/react";
import { Terminal as TerminalIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { terminalMachine } from "@/machines/terminalMachine";
import { useMachineContext } from "@/lib/machineContext";
import "xterm/css/xterm.css";

const PROMPT = "\x1b[2m yard:/project \x1b[0m\x1b[36m$\x1b[0m ";

export function TerminalPanel() {
    const { engineActor } = useMachineContext();

    const [state, send] = useMachine(terminalMachine, {
        input: { engineActor }
    });
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<XTerminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    const lastPrintedIndex = useRef(0);

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
            term.write('\x1b[2K\r');

            const newLines = lines.slice(start);
            newLines.forEach((line: { text: string; kind: string; }) => {
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
            lastPrintedIndex.current = lines.length;
        }
        term.write(`\x1b[2K\r${PROMPT}${state.context.inputBuffer}`);
    }, [state.context.outputLines, state.context.inputBuffer]);

    return (
        <div className="flex flex-col shrink-0 bg-yard-bg border-t border-yard-border [box-shadow:0_0_28px_0_hsl(176_80%_45%_/_0.22)] h-[320px]">
            <div className="flex items-center gap-2 px-3 py-2 bg-yard-header border-b border-yard-border shrink-0">
                <TerminalIcon size={13} className="text-yard-muted" />
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
                        <TerminalIcon size={11} className="mr-1.5" />
                        terminal 1
                    </TabsTrigger>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-yard-muted hover:text-yard-fg hover:bg-transparent">
                        <Plus size={11} />
                    </Button>
                </TabsList>

                <TabsContent value="terminal-1" className="flex-1 m-0 p-0 relative min-h-0 bg-yard-bg">
                    <div ref={containerRef} className="h-full w-full [padding-left:12px;padding-top:8px]" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
