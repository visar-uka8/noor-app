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
  const { role: profileRole, isLoading: isRoleLoading } = useUserRole();
  const familyMemberNav = useFamilyMemberNav(profileRole);

  useEffect(() => {
    if (isRoleLoading) return;
    if (familyMemberNav) {
      router.replace("/");
    }
  }, [familyMemberNav, isRoleLoading, router]);

  if (isRoleLoading || familyMemberNav) {
    return null;
  }

  return children;
}
