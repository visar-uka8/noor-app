import { AppHeader } from "@/components/AppHeader";
import { MedicationForm } from "@/components/MedicationForm";

export default async function EditMedicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col">
      <AppHeader showBack backHref="/medication" title="Medikament bearbeiten" />
      <MedicationForm medicationId={id} />
    </div>
  );
}
