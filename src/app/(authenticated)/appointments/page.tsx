import { AppHeader } from "@/components/AppHeader";
import { AppointmentsScreen } from "@/components/AppointmentsScreen";

export default function AppointmentsPage() {
  return (
    <div className="flex flex-col">
      <AppHeader showBack title="Arzttermine" />
      <AppointmentsScreen />
    </div>
  );
}
