import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase server environment variables");
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const UPLOAD_BUCKET = "fashion360-uploads";
// Separate bucket for 3D model assets — created with a much higher
// fileSizeLimit than the images bucket, which is fixed at creation time.
export const MODEL_UPLOAD_BUCKET = "fashion360-models";
