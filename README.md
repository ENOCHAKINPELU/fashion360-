# Fashion360

Fashion360 is a Next.js application for fashion businesses and their customers.

## Getting started

Copy `.env.example` to `.env`, fill in the required values, then run:

```bash
npm run dev
```

## Vercel deployment

Static marketing images are committed in `public/images/fashion360` and are served from URLs beginning with `/images/fashion360/`. Do not move these files outside `public` or add `public/images` to `.vercelignore`.

Before deploying, add these environment variables in Vercel for the Production environment (and Preview if you use preview deployments):

```text
DATABASE_URL
DIRECT_URL
AUTH_SECRET
AUTH_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
PAYMENT_PROVIDER
PAYSTACK_SECRET_KEY
EMAIL_FROM
RESEND_API_KEY
ENCRYPTION_KEY
```

Set `AUTH_URL` to your production site origin, for example `https://your-project.vercel.app` (without a trailing slash). Use a hosted PostgreSQL connection for `DATABASE_URL`; a local `localhost` database is not reachable from Vercel. The Supabase values are required for image and file uploads.

After saving the variables, redeploy the latest commit. Vercel only applies environment-variable changes to newly created deployments.
