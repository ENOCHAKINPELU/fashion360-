import { supabaseServer, UPLOAD_BUCKET, MODEL_UPLOAD_BUCKET } from "@/lib/supabase-server";
import { ApiError } from "@/lib/rbac";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// 3D assets (and their MIME types) aren't reliably reported by browsers —
// glb/obj/fbx often come through as "application/octet-stream" or "" — so
// this path validates by file extension instead of file.type.
const MODEL_MAX_BYTES = 50 * 1024 * 1024; // 50MB
const MODEL_EXTENSIONS: Record<string, string> = {
  glb: "GLB",
  gltf: "GLTF",
  obj: "OBJ",
  fbx: "FBX",
};

// Same extension-based validation reasoning as 3D models — mobile browsers
// often report video/quicktime or "" rather than a clean MIME type.
const VIDEO_MAX_BYTES = 25 * 1024 * 1024; // 25MB
const VIDEO_EXTENSIONS: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

let bucketReady = false;
let modelBucketReady = false;

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

async function ensureModelBucket() {
  if (modelBucketReady) return;
  const { data: buckets } = await supabaseServer.storage.listBuckets();
  if (!buckets?.some((b) => b.name === MODEL_UPLOAD_BUCKET)) {
    await supabaseServer.storage.createBucket(MODEL_UPLOAD_BUCKET, {
      public: true,
      fileSizeLimit: MODEL_MAX_BYTES,
    });
  }
  modelBucketReady = true;
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

export async function uploadModelFile(file: File, folder: string, keyPrefix: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const format = MODEL_EXTENSIONS[ext];
  if (!format) {
    throw new ApiError(400, "Only GLB, glTF, OBJ, or FBX 3D model files are allowed");
  }
  if (file.size > MODEL_MAX_BYTES) {
    throw new ApiError(400, "3D model must be smaller than 50MB");
  }

  await ensureModelBucket();

  const path = `${folder}/${keyPrefix}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseServer.storage
    .from(MODEL_UPLOAD_BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: true });

  if (error) throw new ApiError(500, `Upload failed: ${error.message}`);

  const { data } = supabaseServer.storage.from(MODEL_UPLOAD_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, format, fileSizeBytes: file.size };
}

// Dispute evidence videos (Part 18/22) — reuses the model bucket since it's
// already sized/configured for large binary uploads, rather than creating a
// third Supabase bucket for what's a small, occasional use case.
export async function uploadVideoFile(file: File, folder: string, keyPrefix: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = VIDEO_EXTENSIONS[ext];
  if (!contentType) {
    throw new ApiError(400, "Only MP4, MOV, or WEBM videos are allowed");
  }
  if (file.size > VIDEO_MAX_BYTES) {
    throw new ApiError(400, "Video must be smaller than 25MB");
  }

  await ensureModelBucket();

  const path = `${folder}/${keyPrefix}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabaseServer.storage
    .from(MODEL_UPLOAD_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });

  if (error) throw new ApiError(500, `Upload failed: ${error.message}`);

  const { data } = supabaseServer.storage.from(MODEL_UPLOAD_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, fileSizeBytes: file.size };
}
