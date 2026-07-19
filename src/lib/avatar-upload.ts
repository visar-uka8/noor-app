import type { SupabaseClient } from "@supabase/supabase-js";

const maxAvatarSize = 400;

export async function resizeImageFile(file: File, maxSize = maxAvatarSize) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Bildverarbeitung wird von diesem Gerät nicht unterstützt.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
          return;
        }

        reject(new Error("Profilbild konnte nicht verarbeitet werden."));
      },
      "image/jpeg",
      0.85,
    );
  });

  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export async function uploadUserAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
) {
  const resized = await resizeImageFile(file);
  const fileName = `${userId}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, resized, {
      upsert: true,
      contentType: "image/jpeg",
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (profileError) {
    throw profileError;
  }

  return avatarUrl;
}

export async function pickAndUploadAvatar(
  supabase: SupabaseClient,
  userId: string,
) {
  return new Promise<string>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve("");
        return;
      }

      try {
        const avatarUrl = await uploadUserAvatar(supabase, userId, file);
        resolve(avatarUrl);
      } catch (error) {
        reject(error);
      }
    };

    input.oncancel = () => resolve("");
    input.click();
  });
}
