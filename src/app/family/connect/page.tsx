import { AppHeader } from "@/components/AppHeader";
import { FamilyConnectFlow } from "@/components/FamilyConnectFlow";

export default function FamilyConnectPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-app flex-1 flex-col">
      <AppHeader showBack title="Familie verbinden" />
      <FamilyConnectFlow />
    </div>
  );
}
