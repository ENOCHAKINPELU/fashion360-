import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { uploadImage } from "@/lib/uploads";

const ALLOWED_FOLDERS = new Set(["logos", "avatars"]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, "Not authenticated");

    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "");

    if (!(file instanceof File)) throw new ApiError(400, "No file provided");
    if (!ALLOWED_FOLDERS.has(folder)) throw new ApiError(400, "Invalid upload folder");

    const url = await uploadImage(file, folder, session.user.id);
    return NextResponse.json({ url });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
