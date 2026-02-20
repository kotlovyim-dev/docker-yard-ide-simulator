"use client";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { type ActorRefFrom, createActor } from "xstate";
import { engineMachine } from "@/machines/engineMachine";
import { ideMachine } from "@/machines/ideMachine";
import { lessonMachine } from "@/machines/lessonMachine";
import { lessons } from "@/lessons";
import { loadLessonProgress } from "@/lib/lessonStorage";
import type { EngineContext, WorkspaceContext } from "@/engine/types";
import {
    clearStoredSession,
    loadStoredSession,
    saveStoredSession,
    type StoredSession,
} from "@/lib/sessionStorage";

type MachineContextType = {
    engineActor: ActorRefFrom<typeof engineMachine>;
    ideActor: ActorRefFrom<typeof ideMachine>;
    lessonActor: ActorRefFrom<typeof lessonMachine>;
    lessonHydrated: boolean;
    sessionStatus: "checking" | "prompt" | "ready" | "restored";
    storedSession: StoredSession | null;
    restoreSession: () => void;
    discardSession: () => void;
};

const MachineContext = createContext<MachineContextType | null>(null);

export function MachineProvider({ children }: { children: React.ReactNode }) {
    const [lessonHydrated, setLessonHydrated] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<
        "checking" | "prompt" | "ready" | "restored"
    >("checking");
    const [storedSession, setStoredSession] = useState<StoredSession | null>(
        null,
    );
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const services = useMemo(() => {
        const engineActor = createActor(engineMachine, { input: {} }).start();

        const ideActor = createActor(ideMachine, { input: {} }).start();

        const lessonActor = createActor(lessonMachine, {
            input: {
                availableLessons: lessons,
            },
        }).start();

        return { engineActor, ideActor, lessonActor };
    }, []);

    useEffect(() => {
        const session = loadStoredSession();
        if (session) {
            setStoredSession(session);
            setSessionStatus("prompt");
        } else {
            setSessionStatus("ready");
        }
    }, []);

    const restoreSession = useCallback(() => {
        if (!storedSession) {
            setSessionStatus("ready");
            return;
        }
        services.engineActor.send({
            type: "RESET_TO_SNAPSHOT",
            snapshot: storedSession.engine,
        });
        services.ideActor.send({
            type: "HYDRATE_WORKSPACE",
            workspace: storedSession.workspace,
        });
        services.lessonActor.send({ type: "EXIT_TO_MENU" });
        setSessionStatus("restored");
    }, [services, storedSession]);

    const discardSession = useCallback(() => {
        clearStoredSession();
        setStoredSession(null);
        setSessionStatus("ready");
    }, []);

    useEffect(() => {
        if (sessionStatus !== "ready") return;
        const progress = loadLessonProgress();
        if (progress) {
            services.lessonActor.send({
                type: "HYDRATE_PROGRESS",
                progress,
            });
        }
        setLessonHydrated(true);
    }, [sessionStatus, services.lessonActor]);

    useEffect(() => {
        if (sessionStatus !== "restored") return;
        setLessonHydrated(true);
    }, [sessionStatus]);

    useEffect(() => {
        if (sessionStatus !== "ready" && sessionStatus !== "restored") return;

        function scheduleSave() {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => {
                const engineContext =
                    services.engineActor.getSnapshot().context;
                const ideContext = services.ideActor.getSnapshot().context;

                const sanitizedEngine: EngineContext = {
                    ...engineContext,
                    pendingCommand: null,
                    lastError: null,
                };
                const workspace: WorkspaceContext = {
                    files: ideContext.files,
                    activeFilePath: ideContext.activeFilePath,
                    diagnostics: ideContext.diagnostics,
                    openTabs: ideContext.openTabs,
                };

                saveStoredSession(sanitizedEngine, workspace);
            }, 300);
        }

        const engineSub = services.engineActor.subscribe(() => scheduleSave());
        const ideSub = services.ideActor.subscribe(() => scheduleSave());

        return () => {
            engineSub.unsubscribe();
            ideSub.unsubscribe();
            if (saveTimer.current) clearTimeout(saveTimer.current);
        };
    }, [services, sessionStatus]);

    return (
        <MachineContext.Provider
            value={{
                ...services,
                lessonHydrated,
                sessionStatus,
                storedSession,
                restoreSession,
                discardSession,
            }}
        >
            {children}
        </MachineContext.Provider>
    );
}

export function useMachineContext() {
    const context = useContext(MachineContext);
    if (!context) {
        throw new Error(
            "useMachineContext must be used within a MachineProvider",
        );
    }
    return context;
}

export function makeGetWorkspace(ideActor: ActorRefFrom<typeof ideMachine>) {
    return () => ideActor.getSnapshot().context.files;
}
