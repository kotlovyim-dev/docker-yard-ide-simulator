"use client";
import React, { useRef, useState, useCallback, useEffect } from "react";
import { TopBar } from "./TopBar";
import { ExplorerPanel } from "./ExplorerPanel";
import { EditorPanel } from "./EditorPanel";
import { YardPanel } from "./YardPanel";
import { TerminalPanel } from "./TerminalPanel";
import { StatusBar } from "./StatusBar";
import { LessonBridge } from "./LessonBridge";
import { SessionRestorePrompt } from "./SessionRestorePrompt";

const MIN_EXPLORER = 120;
const MAX_EXPLORER = 420;
const YARD_WIDTH = 320;
const MIN_TERMINAL = 120;
const MAX_TERMINAL_FALLBACK = 600;

function useResize(
    initial: number,
    min: number,
    max: number,
    direction: "horizontal-left" | "horizontal-right" | "vertical",
) {
    const [size, setSize] = useState(initial);
    const dragging = useRef(false);
    const startPos = useRef(0);
    const startSize = useRef(0);

    const onPointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            dragging.current = true;
            startPos.current = direction === "vertical" ? e.clientY : e.clientX;
            startSize.current = size;
        },
        [direction, size],
    );

    const onPointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!dragging.current) return;
            const pos = direction === "vertical" ? e.clientY : e.clientX;
            const delta = pos - startPos.current;
            const sign = direction === "horizontal-left" ? 1 : -1;
            const next = Math.min(
                max,
                Math.max(min, startSize.current + sign * delta),
            );
            setSize(next);
        },
        [direction, min, max],
    );

    const onPointerUp = useCallback(() => {
        dragging.current = false;
    }, []);

    const handleProps = { onPointerDown, onPointerMove, onPointerUp };
    return [size, handleProps] as const;
}

function ResizeHandle({
    direction,
    handleProps,
}: {
    direction: "horizontal" | "vertical";
    handleProps: ReturnType<typeof useResize>[1];
}) {
    const isH = direction === "horizontal";
    return (
        <div
            {...handleProps}
            className={[
                "shrink-0 relative group select-none",
                isH
                    ? "w-1.25 cursor-col-resize hover:bg-teal/20 active:bg-teal/30"
                    : "h-1.25 cursor-row-resize hover:bg-teal/20 active:bg-teal/30",
            ].join(" ")}
        >
            <div
                className={[
                    "absolute bg-yard-border group-hover:bg-teal/40 group-active:bg-teal transition-colors",
                    isH ? "inset-y-0 left-0.5 w-px" : "inset-x-0 top-0.5 h-px",
                ].join(" ")}
            />
        </div>
    );
}

export function IDEShell() {
    const [terminalMax, setTerminalMax] = useState(() => {
        if (typeof window === "undefined") return MAX_TERMINAL_FALLBACK;
        return Math.max(MIN_TERMINAL, Math.floor(window.innerHeight / 3));
    });

    useEffect(() => {
        function updateTerminalMax() {
            setTerminalMax(
                Math.max(MIN_TERMINAL, Math.floor(window.innerHeight / 3)),
            );
        }

        updateTerminalMax();
        window.addEventListener("resize", updateTerminalMax);
        return () => window.removeEventListener("resize", updateTerminalMax);
    }, []);

    const [explorerW, explorerHandle] = useResize(
        200,
        MIN_EXPLORER,
        MAX_EXPLORER,
        "horizontal-left",
    );
    const yardW = YARD_WIDTH;
    const [terminalH, terminalHandle] = useResize(
        180,
        MIN_TERMINAL,
        terminalMax,
        "vertical",
    );

    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-yard-bg">
            <LessonBridge />
            <SessionRestorePrompt />
            <TopBar />

            <div className="flex flex-1 min-h-0 overflow-hidden">
                <div
                    style={{ width: explorerW }}
                    className="shrink-0 flex overflow-hidden"
                >
                    <ExplorerPanel />
                </div>

                <ResizeHandle
                    direction="horizontal"
                    handleProps={explorerHandle}
                />

                <div className="flex-1 min-w-0 overflow-hidden h-full flex flex-col">
                    <EditorPanel />
                </div>

                <div
                    style={{ width: yardW }}
                    className="shrink-0 flex overflow-hidden"
                >
                    <YardPanel />
                </div>
            </div>

            <ResizeHandle direction="vertical" handleProps={terminalHandle} />

            <div
                style={{ height: terminalH }}
                className="shrink-0 overflow-hidden"
            >
                <TerminalPanel />
            </div>

            <StatusBar />
        </div>
    );
}
