import { AppHeader } from "@/components/AppHeader";
import { FamilyConnectFlow } from "@/components/FamilyConnectFlow";
import { PublicPageShell } from "@/components/PublicPageShell";

export default function FamilyConnectPage() {
  return (
    <PublicPageShell>
      <div className="mx-auto flex w-full max-w-app flex-col">
        <AppHeader showBack title="Familie" />
        <FamilyConnectFlow />
      </div>
    </PublicPageShell>
  );
}
