import { loadAllPills } from "@/lib/pills/load";
import { RegistryExplorer } from "@/components/registry/RegistryExplorer";

export default function RegistryPage() {
  // Server loads the file pills; the client explorer seeds the governance store.
  const bundles = loadAllPills();
  return <RegistryExplorer bundles={bundles} />;
}
