import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { uploadImage, uploadModelFile, uploadVideoFile } from "@/lib/uploads";

const ALLOWED_FOLDERS = new Set([
  "logos",
  "avatars",
  "measurement-photos",
  "measurement-files",
  "designs",
  "fabrics",
  "inspirations",
  "orders",
  "portfolio",
  "service-requests",
  "design-references",
  "production-photos",
  "dispute-evidence",
  "review-photos",
]);

const MODEL_ALLOWED_FOLDERS = new Set(["design-models"]);
const VIDEO_ALLOWED_FOLDERS = new Set(["dispute-evidence"]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, "Not authenticated");

    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "");
    const kind = String(form.get("kind") ?? "image");

    if (!(file instanceof File)) throw new ApiError(400, "No file provided");

    if (kind === "model") {
      if (!MODEL_ALLOWED_FOLDERS.has(folder)) throw new ApiError(400, "Invalid upload folder");
      const result = await uploadModelFile(file, folder, session.user.id);
      return NextResponse.json(result);
    }

    if (kind === "video") {
      if (!VIDEO_ALLOWED_FOLDERS.has(folder)) throw new ApiError(400, "Invalid upload folder");
      const result = await uploadVideoFile(file, folder, session.user.id);
      return NextResponse.json(result);
    }

    if (!ALLOWED_FOLDERS.has(folder)) throw new ApiError(400, "Invalid upload folder");
    const url = await uploadImage(file, folder, session.user.id);
    return NextResponse.json({ url });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
