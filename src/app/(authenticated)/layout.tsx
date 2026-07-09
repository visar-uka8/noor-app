import { AuthenticatedAppShell } from "@/components/AuthenticatedAppShell";

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
