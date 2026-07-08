export function SlowConnectionNotice({ message }: { message: string }) {
  return (
    <p
      className="text-body mt-4 rounded-2xl bg-warning-light px-4 py-3 text-center font-semibold text-warning"
      role="status"
    >
      {message}
    </p>
  );
}
