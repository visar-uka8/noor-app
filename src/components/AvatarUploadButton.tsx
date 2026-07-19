"use client";

import { useEffect, useState } from "react";
import { resizeImageFile } from "@/lib/avatar-upload";
import { getProfileInitials } from "@/lib/profile-display";
import { getSupabase } from "@/lib/supabase";

type AvatarUploadButtonProps = {
  userId: string;
  avatarUrl?: string | null;
  name: string;
  firstName?: string;
  lastName?: string;
  size?: number;
  onUploaded?: (avatarUrl: string) => void;
};

function CameraBadgeIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

async function fileToBase64(file: Blob) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function AvatarUploadButton({
  userId,
  avatarUrl,
  name,
  firstName,
  lastName,
  size = 80,
  onUploaded,
}: AvatarUploadButtonProps) {
  const [currentUrl, setCurrentUrl] = useState(avatarUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUrl(avatarUrl ?? null);
  }, [avatarUrl]);

  const initials =
    getProfileInitials(firstName, lastName) ||
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    "N";

  const fontSize = Math.max(16, Math.round(size * (28 / 80)));

  function handleAvatarUpload() {
    if (!userId || isUploading) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      setErrorMessage(null);

      try {
        let uploadFile: Blob = file;
        try {
          uploadFile = await resizeImageFile(file);
        } catch (resizeError) {
          console.warn("Avatar resize failed, uploading original:", resizeError);
        }

        const supabase = getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const imageBase64 = await fileToBase64(uploadFile);
        console.log("Avatar upload payload bytes:", uploadFile.size);

        const response = await fetch("/api/profile/avatar", {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            imageBase64,
            contentType: uploadFile.type || "image/jpeg",
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { avatarUrl?: string; error?: string }
          | null;

        console.log("Avatar upload response:", response.status, payload);

        if (!response.ok) {
          setErrorMessage(
            payload?.error ?? "Profilbild konnte nicht hochgeladen werden.",
          );
          return;
        }

        const publicUrl = payload?.avatarUrl;
        if (!publicUrl) {
          setErrorMessage("Profilbild konnte nicht hochgeladen werden.");
          return;
        }

        setCurrentUrl(publicUrl);
        onUploaded?.(publicUrl);
      } catch (error) {
        console.error("Avatar upload failed:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Profilbild konnte nicht hochgeladen werden.",
        );
      } finally {
        setIsUploading(false);
      }
    };

    input.click();
  }

  return (
    <div className="flex flex-col items-center">
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          margin: "0 auto",
        }}
      >
        <button
          type="button"
          onClick={handleAvatarUpload}
          disabled={isUploading}
          aria-label="Profilbild ändern"
          aria-busy={isUploading}
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
            overflow: "hidden",
            cursor: isUploading ? "wait" : "pointer",
            border: "none",
            padding: 0,
            opacity: isUploading ? 0.75 : 1,
          }}
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={name}
              onError={() => setCurrentUrl(null)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            initials
          )}
        </button>

        <button
          type="button"
          onClick={handleAvatarUpload}
          disabled={isUploading}
          aria-label="Profilbild hochladen"
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 26,
            height: 26,
            borderRadius: "50%",
            backgroundColor: "#1D9E75",
            border: "2px solid #FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isUploading ? "wait" : "pointer",
            zIndex: 10,
            padding: 0,
          }}
        >
          {isUploading ? (
            <span
              style={{ fontSize: 10, fontWeight: 600, color: "#FFFFFF" }}
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <CameraBadgeIcon />
          )}
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
