import { Suspense } from "react";
import { RegisterForm } from "@/components/RegisterForm";

export default function ComingSoonPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
