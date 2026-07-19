"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";
import { useFamilyMemberNav } from "@/lib/family-member-flow";

export function FamilyMemberMedicationRedirect({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const profileRole = useUserRole();
  const familyMemberNav = useFamilyMemberNav(profileRole);

  useEffect(() => {
    if (profileRole === null) return;
    if (familyMemberNav) {
      router.replace("/");
    }
  }, [familyMemberNav, profileRole, router]);

  if (profileRole === null || familyMemberNav) {
    return null;
  }

  return children;
}
