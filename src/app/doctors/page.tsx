import { AppHeader } from "@/components/AppHeader";
import { DoctorSearch } from "@/components/DoctorSearch";

export default function DoctorsPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader showBack title="Arzt buchen" />
      <DoctorSearch />
    </div>
  );
}
