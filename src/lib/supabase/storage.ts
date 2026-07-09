import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const SUPABASE_MEDIA_BUCKET = "property-media";

function normalizeFileName(name: string) {
  const extensionIndex = name.lastIndexOf(".");
  const baseName = extensionIndex >= 0 ? name.slice(0, extensionIndex) : name;
  const extension = extensionIndex >= 0 ? name.slice(extensionIndex).toLowerCase() : "";

  return `${baseName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .concat(extension);
}

export function buildStoragePath(scope: string, fileName: string, entityId?: string) {
  const normalizedName = normalizeFileName(fileName);
  const prefix = entityId ? `${scope}/${entityId}` : scope;

  return `${prefix}/${crypto.randomUUID()}-${normalizedName}`;
}

export function getPublicStorageUrl(path: string) {
  const supabase = createSupabaseServiceClient();
  const { data } = supabase.storage.from(SUPABASE_MEDIA_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}

export async function uploadFilesToStorage({
  files,
  scope,
  entityId
}: {
  files: File[];
  scope: string;
  entityId?: string;
}) {
  const supabase = createSupabaseServiceClient();
  const uploads: Array<{ path: string; url: string; fileName: string }> = [];

  for (const file of files) {
    const path = buildStoragePath(scope, file.name, entityId);
    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage.from(SUPABASE_MEDIA_BUCKET).upload(path, arrayBuffer, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });

    if (error) {
      throw error;
    }

    uploads.push({
      path,
      url: getPublicStorageUrl(path),
      fileName: file.name
    });
  }

  return uploads;
}

export async function removeStorageObjects(paths: string[]) {
  const validPaths = paths.filter(Boolean);

  if (!validPaths.length) {
    return;
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage.from(SUPABASE_MEDIA_BUCKET).remove(validPaths);

  if (error) {
    throw error;
  }
}
