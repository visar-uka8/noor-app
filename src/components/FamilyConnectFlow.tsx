"use client";

import { FamilyConnectInvite } from "@/components/FamilyConnectInvite";
import { FamilyConnectJoin } from "@/components/FamilyConnectJoin";

export function FamilyConnectFlow() {
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-6 px-5 py-6">
      <FamilyConnectInvite />

      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm font-medium text-muted">oder</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <FamilyConnectJoin />
    </main>
  );
}
