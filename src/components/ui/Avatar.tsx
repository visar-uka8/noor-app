"use client";

import { useEffect, useState } from "react";
import { getProfileInitials } from "@/lib/profile-display";

type AvatarProps = {
  url?: string | null;
  name: string;
  firstName?: string;
  lastName?: string;
  initials?: string;
  size?: number;
  bordered?: boolean;
  className?: string;
};

export function Avatar({
  url,
  name,
  firstName,
  lastName,
  initials: initialsOverride,
  size = 44,
  bordered = false,
  className = "",
}: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(url) && url !== failedUrl;

  useEffect(() => {
    setFailedUrl(null);
  }, [url]);

  const initials =
    initialsOverride ||
    getProfileInitials(firstName, lastName) ||
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    "N";

  const fontSize = Math.max(12, Math.round(size * (16 / 44)));

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "#085041",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 600,
        color: "#FFFFFF",
        flexShrink: 0,
        border: bordered ? "2px solid rgba(255,255,255,0.3)" : undefined,
        overflow: "hidden",
      }}
      aria-hidden={showImage ? undefined : true}
    >
      {showImage && url ? (
        <img
          src={url}
          alt={name}
          onError={() => setFailedUrl(url)}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}
