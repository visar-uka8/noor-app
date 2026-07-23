"use client";

import { useMemo } from "react";
import {
  NEAREST_PHARMACY_LABEL,
  openNearestPharmacy,
  resolvePharmacyMapsSearchTerm,
} from "@/lib/pharmacy-providers";

type MedicationPharmacySectionProps = {
  countryCode?: string | null;
};

export function MedicationPharmacySection({
  countryCode = null,
}: MedicationPharmacySectionProps) {
  const mapsSearchTerm = useMemo(
    () => resolvePharmacyMapsSearchTerm({ countryCode }),
    [countryCode],
  );

  return (
    <section
      className="noor-card mt-5 p-5"
      aria-labelledby="medication-pharmacy-heading"
    >
      <h2
        id="medication-pharmacy-heading"
        className="text-lg font-bold text-[#085041]"
      >
        Pharmacy
      </h2>
      <p className="mt-1 text-[13px] text-[#88856F]">
        Opens Google Maps near your current location
      </p>

      <button
        type="button"
        onClick={() => openNearestPharmacy(mapsSearchTerm)}
        className="btn-primary mt-4 min-h-[52px] w-full"
      >
        {NEAREST_PHARMACY_LABEL}
      </button>
    </section>
  );
}
