import { AppHeader } from "@/components/AppHeader";
import { ActivityHistoryScreen } from "@/components/ActivityHistoryScreen";

export default function ActivityPage() {
  return (
    <div className="flex flex-col">
      <AppHeader showBack titleKey="activity_title" />
      <main className="mx-auto w-full max-w-app flex-1 px-5 py-6">
        <ActivityHistoryScreen />
      </main>
    </div>
  );
}
