import { IDEShell } from "@/components/shell/IDEShell";
import { MachineProvider } from "@/lib/machineContext";

export default function Home() {
  return (
    <MachineProvider>
      <IDEShell />
    </MachineProvider>
  );
}
