import { AppHeader } from "@/components/AppHeader";
import { SettingsScreen } from "@/components/SettingsScreen";

export default function SettingsPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader title="Profil" />
      <SettingsScreen />
    </div>
  );
}
