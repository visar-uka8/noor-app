import { AppHeader } from "@/components/AppHeader";
import { ProfileEditScreen } from "@/components/ProfileEditScreen";

export default function ProfileEditPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader showBack backHref="/settings" title="Profil bearbeiten" />
      <ProfileEditScreen />
    </div>
  );
}
