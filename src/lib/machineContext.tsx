"use client";
import { createContext, useContext, useMemo } from "react";
import { type ActorRefFrom, createActor } from "xstate";
import { engineMachine } from "@/machines/engineMachine";
import { ideMachine } from "@/machines/ideMachine";
import { lessonMachine } from "@/machines/lessonMachine";

type MachineContextType = {
    engineActor: ActorRefFrom<typeof engineMachine>;
    ideActor: ActorRefFrom<typeof ideMachine>;
    lessonActor: ActorRefFrom<typeof lessonMachine>;
};

const MachineContext = createContext<MachineContextType | null>(null);

export function MachineProvider({ children }: { children: React.ReactNode }) {
    const services = useMemo(() => {
        const engineActor = createActor(engineMachine, { input: {} }).start();

        const ideActor = createActor(ideMachine, { input: {} }).start();

        const lessonActor = createActor(lessonMachine, { input: {} }).start();

        return { engineActor, ideActor, lessonActor };
    }, []);

    return (
        <MachineContext.Provider value={services}>
            {children}
        </MachineContext.Provider>
    );
}

export function useMachineContext() {
    const context = useContext(MachineContext);
    if (!context) {
        throw new Error("useMachineContext must be used within a MachineProvider");
    }
    return context;
}

export function makeGetWorkspace(ideActor: ActorRefFrom<typeof ideMachine>) {
    return () => ideActor.getSnapshot().context.files;
}
