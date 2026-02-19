import { TopBar } from "./TopBar";
import { ExplorerPanel } from "./ExplorerPanel";
import { EditorPanel } from "./EditorPanel";
import { YardPanel } from "./YardPanel";
import { TerminalPanel } from "./TerminalPanel";
import { StatusBar } from "./StatusBar";

export function IDEShell() {
    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-yard-bg">
            <TopBar />

            <div className="flex flex-1 min-h-0 overflow-hidden">
                <ExplorerPanel />
                <EditorPanel />
                <YardPanel />
            </div>

            <TerminalPanel />
            <StatusBar />
        </div>
    );
}
