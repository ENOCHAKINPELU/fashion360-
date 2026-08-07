import { LoginForm } from "./login-form";

// Server component so the Google button can be gated on real server-only
// env vars (AUTH_GOOGLE_ID/SECRET are never NEXT_PUBLIC_-prefixed, so a
// client component can't see them directly). Showing a "Continue with
// Google" button that's guaranteed to fail because no OAuth app is
// configured is worse than not showing it — the button reappears
// automatically the moment real credentials are set, no code change needed.
export default function LoginPage() {
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  return <LoginForm googleEnabled={googleEnabled} />;
}
