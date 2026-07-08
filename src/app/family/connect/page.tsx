import { AppHeader } from "@/components/AppHeader";
import { FamilyConnectFlow } from "@/components/FamilyConnectFlow";

export default function FamilyConnectPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader showBack title="Familie verbinden" />
      <FamilyConnectFlow />
    </div>
  );
}
