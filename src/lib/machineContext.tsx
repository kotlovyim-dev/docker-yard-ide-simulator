"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type ActorRefFrom, createActor } from "xstate";
import { engineMachine } from "@/machines/engineMachine";
import { ideMachine } from "@/machines/ideMachine";
import { lessonMachine } from "@/machines/lessonMachine";
import { lessons } from "@/lessons";
import { loadLessonProgress } from "@/lib/lessonStorage";

type MachineContextType = {
    engineActor: ActorRefFrom<typeof engineMachine>;
    ideActor: ActorRefFrom<typeof ideMachine>;
    lessonActor: ActorRefFrom<typeof lessonMachine>;
    lessonHydrated: boolean;
};

const MachineContext = createContext<MachineContextType | null>(null);

export function MachineProvider({ children }: { children: React.ReactNode }) {
    const [lessonHydrated, setLessonHydrated] = useState(false);
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
        const progress = loadLessonProgress();
        if (!progress) return;
        services.lessonActor.send({
            type: "HYDRATE_PROGRESS",
            progress,
        });
        setLessonHydrated(true);
    }, [services.lessonActor]);

    useEffect(() => {
        if (lessonHydrated) return;
        const progress = loadLessonProgress();
        if (progress) return;
        setLessonHydrated(true);
    }, [lessonHydrated]);

    return (
        <MachineContext.Provider value={{ ...services, lessonHydrated }}>
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
