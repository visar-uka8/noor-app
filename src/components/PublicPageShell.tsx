type PublicPageShellProps = {
  children: React.ReactNode;
};

export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className="app-shell">
      <main className="app-scroll-main">{children}</main>
    </div>
  );
}
