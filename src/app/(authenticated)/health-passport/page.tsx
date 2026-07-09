import { AppHeader } from "@/components/AppHeader";
import { HealthPassport } from "@/components/HealthPassport";

export default function HealthPassportPage() {
  return (
    <div className="flex flex-col">
      <AppHeader showBack title="Gesundheitspass" />
      <HealthPassport />
    </div>
  );
}
