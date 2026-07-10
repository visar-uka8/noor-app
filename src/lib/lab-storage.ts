import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveLabFileType } from "@/lib/lab-file";

export function sanitizeLabFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function uploadLabResultFile(
  supabase: SupabaseClient,
  userId: string,
  file: File,
) {
  const today = new Date().toISOString().slice(0, 10);
  const filePath = `${userId}/${today}/${Date.now()}-${sanitizeLabFileName(file.name)}`;
  const contentType =
    resolveLabFileType(file) ?? file.type ?? "application/octet-stream";
  const fileBody = await file.arrayBuffer();

  const { error } = await supabase.storage.from("lab-results").upload(filePath, fileBody, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return filePath;
}
