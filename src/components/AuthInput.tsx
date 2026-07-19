"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const inputClassName =
  "min-h-12 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base font-normal outline-none focus:border-primary";

export function AuthInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
      {label}
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </label>
  );
}

export function AuthPasswordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="flex flex-col gap-2 text-base font-semibold text-foreground">
      {label}
      <div className="relative">
        <input
          required
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClassName} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center justify-center p-1 text-muted"
          aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
        >
          {showPassword ? (
            <EyeOff size={20} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Eye size={20} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>
    </label>
  );
}
