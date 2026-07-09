import { AppHeader } from "@/components/AppHeader";
import { SettingsScreen } from "@/components/SettingsScreen";

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <AppHeader title="Profil" />
      <SettingsScreen />
    </div>
  );
}
