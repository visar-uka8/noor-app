const ACCEPTED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  heic: "image/heic",
  heif: "image/heic",
};

export function resolveLabFileType(file: File) {
  if (ACCEPTED_MEDIA_TYPES.has(file.type)) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension) return null;

  return EXTENSION_TO_MIME[extension] ?? null;
}

export function isHeicFile(file: File) {
  const resolved = resolveLabFileType(file);
  return resolved === "image/heic";
}

export function isAcceptedLabFile(file: File) {
  const resolved = resolveLabFileType(file);
  return resolved !== null && ACCEPTED_MEDIA_TYPES.has(resolved);
}

export function fileWithResolvedType(file: File) {
  const resolved = resolveLabFileType(file);
  if (!resolved || resolved === file.type) return file;

  return new File([file], file.name, {
    type: resolved,
    lastModified: file.lastModified,
  });
}
