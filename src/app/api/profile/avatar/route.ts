import { getAuthenticatedUser } from "@/lib/supabase/request-auth";
import { createSupabaseDataClient } from "@/lib/supabase-data";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { saveProfileAvatarUrl } from "@/lib/profile-avatar-store";

export const runtime = "nodejs";

const maxBytes = 5 * 1024 * 1024;
const bucketId = "avatars";

type JsonAvatarPayload = {
  imageBase64?: unknown;
  contentType?: unknown;
  avatarUrl?: unknown;
};

export async function POST(request: Request) {
  console.log("[profile/avatar] upload started");

  try {
    const { user, authError } = await getAuthenticatedUser(request);

    console.log("[profile/avatar] user:", user?.id ?? null);
    if (authError) {
      console.log("[profile/avatar] auth error:", authError.message);
    }

    if (!user) {
      return Response.json(
        { error: "Bitte melden Sie sich an." },
        { status: 401 },
      );
    }

    const admin = createSupabaseDataClient();
    const supabase = admin ?? (await createServerSupabaseClient());
    console.log("[profile/avatar] using service role:", Boolean(admin));

    const contentTypeHeader = request.headers.get("content-type") ?? "";

    // Path A: client already uploaded — only persist avatar_url.
    if (contentTypeHeader.includes("application/json")) {
      const payload = (await request.json()) as JsonAvatarPayload;

      if (typeof payload.avatarUrl === "string" && payload.avatarUrl.trim()) {
        const avatarUrl = withCacheBust(payload.avatarUrl.trim());
        const profileError = await updateProfileAvatar(
          supabase,
          admin,
          user.id,
          avatarUrl,
        );
        if (profileError) {
          return Response.json(
            {
              error: `Profilbild konnte nicht gespeichert werden: ${profileError}`,
            },
            { status: 500 },
          );
        }
        return Response.json({ avatarUrl });
      }

      const imageBase64 =
        typeof payload.imageBase64 === "string" ? payload.imageBase64 : null;
      if (!imageBase64) {
        return Response.json(
          { error: "Kein Bild ausgewählt." },
          { status: 400 },
        );
      }

      const bytes = decodeBase64Image(imageBase64);
      if (!bytes || bytes.byteLength === 0) {
        return Response.json(
          { error: "Bild konnte nicht gelesen werden." },
          { status: 400 },
        );
      }

      if (bytes.byteLength > maxBytes) {
        return Response.json(
          { error: "Bild ist zu groß (max. 5 MB)." },
          { status: 400 },
        );
      }

      const contentType =
        typeof payload.contentType === "string" &&
        payload.contentType.startsWith("image/")
          ? payload.contentType
          : "image/jpeg";

      console.log("[profile/avatar] json upload bytes:", bytes.byteLength, contentType);

      if (admin) {
        await ensureAvatarsBucket(admin);
      }

      const avatarUrl = await uploadAvatarBytes({
        supabase,
        admin,
        userId: user.id,
        bytes,
        contentType,
      });

      return Response.json({ avatarUrl });
    }

    // Path B: multipart FormData (legacy / fallback).
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("[profile/avatar] formData parse failed:", error);
      return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }

    const file = asUploadFile(formData.get("file"));
    console.log("[profile/avatar] file received:", {
      name: file?.name,
      size: file?.size,
      type: file?.type,
    });

    if (!file || file.size === 0) {
      return Response.json({ error: "Kein Bild ausgewählt." }, { status: 400 });
    }

    if (file.size > maxBytes) {
      return Response.json(
        { error: "Bild ist zu groß (max. 5 MB)." },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = file.type?.startsWith("image/")
      ? file.type
      : "image/jpeg";

    if (admin) {
      await ensureAvatarsBucket(admin);
    }

    const avatarUrl = await uploadAvatarBytes({
      supabase,
      admin,
      userId: user.id,
      bytes,
      contentType,
    });

    return Response.json({ avatarUrl });
  } catch (error) {
    console.error("[profile/avatar] route error:", error);
    const message =
      error instanceof Error ? error.message : "Avatar-Upload fehlgeschlagen.";
    return Response.json({ error: message }, { status: 500 });
  }
}

async function uploadAvatarBytes(input: {
  supabase: NonNullable<
    ReturnType<typeof createSupabaseDataClient>
  > extends infer T
    ? T | Awaited<ReturnType<typeof createServerSupabaseClient>>
    : never;
  admin: ReturnType<typeof createSupabaseDataClient>;
  userId: string;
  bytes: Uint8Array;
  contentType: string;
}) {
  const fileName = `${input.userId}/avatar.jpg`;

  const { data: uploadData, error: uploadError } = await input.supabase.storage
    .from(bucketId)
    .upload(fileName, input.bytes, {
      upsert: true,
      contentType: input.contentType,
      cacheControl: "3600",
    });

  console.log("[profile/avatar] upload result:", uploadData);
  console.log("[profile/avatar] upload error:", uploadError);

  if (uploadError) {
    if (
      input.admin &&
      /bucket|not found|does not exist/i.test(uploadError.message)
    ) {
      await ensureAvatarsBucket(input.admin);
      const retry = await input.admin.storage.from(bucketId).upload(
        fileName,
        input.bytes,
        {
          upsert: true,
          contentType: input.contentType,
          cacheControl: "3600",
        },
      );
      if (retry.error) {
        throw new Error(
          `Bild konnte nicht hochgeladen werden: ${retry.error.message}`,
        );
      }
    } else {
      throw new Error(
        `Bild konnte nicht hochgeladen werden: ${uploadError.message}`,
      );
    }
  }

  const { data: urlData } = input.supabase.storage
    .from(bucketId)
    .getPublicUrl(fileName);
  const avatarUrl = withCacheBust(urlData.publicUrl);

  const profileError = await updateProfileAvatar(
    input.supabase,
    input.admin,
    input.userId,
    avatarUrl,
  );
  if (profileError) {
    throw new Error(
      `Profilbild konnte nicht gespeichert werden: ${profileError}`,
    );
  }

  return avatarUrl;
}

async function updateProfileAvatar(
  supabase: NonNullable<
    ReturnType<typeof createSupabaseDataClient>
  > extends infer T
    ? T | Awaited<ReturnType<typeof createServerSupabaseClient>>
    : never,
  admin: ReturnType<typeof createSupabaseDataClient>,
  userId: string,
  avatarUrl: string,
) {
  const { error, usedMetadataFallback } = await saveProfileAvatarUrl(
    supabase,
    admin,
    userId,
    avatarUrl,
  );

  if (usedMetadataFallback) {
    console.warn(
      "[profile/avatar] saved avatar_url in auth metadata because profiles.avatar_url column is missing",
    );
  }

  console.log("[profile/avatar] profile update error:", error);
  return error;
}

function withCacheBust(url: string) {
  const base = url.split("?")[0] ?? url;
  return `${base}?t=${Date.now()}`;
}

function decodeBase64Image(value: string) {
  const cleaned = value.includes(",")
    ? (value.split(",")[1] ?? "")
    : value.replace(/\s/g, "");

  if (!cleaned) return null;

  try {
    return Uint8Array.from(Buffer.from(cleaned, "base64"));
  } catch (error) {
    console.error("[profile/avatar] base64 decode failed:", error);
    return null;
  }
}

function asUploadFile(value: FormDataEntryValue | null): File | null {
  if (!value || typeof value === "string") return null;

  if (value instanceof File) return value;

  const maybeBlob = value as unknown;
  if (
    maybeBlob &&
    typeof maybeBlob === "object" &&
    "arrayBuffer" in maybeBlob &&
    typeof (maybeBlob as Blob).arrayBuffer === "function" &&
    "size" in maybeBlob &&
    typeof (maybeBlob as Blob).size === "number"
  ) {
    const blob = maybeBlob as Blob & { name?: string };
    return new File([blob], blob.name || "avatar.jpg", {
      type: blob.type || "image/jpeg",
    });
  }

  return null;
}

async function ensureAvatarsBucket(
  admin: NonNullable<ReturnType<typeof createSupabaseDataClient>>,
) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    console.error("[profile/avatar] listBuckets failed:", listError);
    return;
  }

  const existing = buckets?.find((bucket) => bucket.id === bucketId);
  if (existing) {
    if (!existing.public) {
      const { error } = await admin.storage.updateBucket(bucketId, {
        public: true,
      });
      if (error) {
        console.error("[profile/avatar] updateBucket failed:", error);
      }
    }
    return;
  }

  console.log("[profile/avatar] creating avatars bucket");
  const { error: createError } = await admin.storage.createBucket(bucketId, {
    public: true,
    fileSizeLimit: maxBytes,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });

  if (createError && !/already exists/i.test(createError.message)) {
    console.error("[profile/avatar] createBucket failed:", createError);
  }
}
