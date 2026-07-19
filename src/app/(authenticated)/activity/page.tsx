import { AppHeader } from "@/components/AppHeader";
import { DailyActivityCard } from "@/components/DailyActivityCard";

export default function ActivityPage() {
  return (
    <div className="flex flex-col">
      <AppHeader showBack title="Aktivität heute" />
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <DailyActivityCard />
      </main>
    </div>
  );
}
