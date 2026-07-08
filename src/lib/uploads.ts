import { supabaseServer, UPLOAD_BUCKET } from "@/lib/supabase-server";
import { ApiError } from "@/lib/rbac";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

let bucketReady = false;

async function ensureBucket() {
  if (bucketReady) return;
  const { data: buckets } = await supabaseServer.storage.listBuckets();
  if (!buckets?.some((b) => b.name === UPLOAD_BUCKET)) {
    await supabaseServer.storage.createBucket(UPLOAD_BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
    });
  }
  bucketReady = true;
}

export async function uploadImage(file: File, folder: string, keyPrefix: string) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ApiError(400, "Only PNG, JPEG, or WEBP images are allowed");
  }
  if (file.size > MAX_BYTES) {
    throw new ApiError(400, "Image must be smaller than 5MB");
  }

  await ensureBucket();

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${keyPrefix}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseServer.storage
    .from(UPLOAD_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (error) throw new ApiError(500, `Upload failed: ${error.message}`);

  const { data } = supabaseServer.storage.from(UPLOAD_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
