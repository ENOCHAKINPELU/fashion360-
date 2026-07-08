# Fashion360 – Build Prompt (Refined)

> Use this with your AI app builder (Lovable, Bolt, Firebase Studio, Cursor, Windsurf, etc.).
> Refined from the original draft to fix scope, sequencing, tech-stack conflicts, and feasibility issues.

```text
You are a Senior Product Manager, Senior UI/UX Designer, and Senior Full-Stack Software Engineer.

Your task is to design and build a production-ready web application called Fashion360 —
an end-to-end Fashion Business Management Platform (SaaS) for fashion designers, bespoke
fashion houses, tailors, clothing brands, and fashion studios.

This is a MULTI-TENANT SaaS: many fashion businesses use one platform, each with its own
customers, orders, and data. Every table that stores business data must be scoped by a
tenant/business ID, and every query must enforce that scope — a business must never be able
to see another business's customers, orders, or measurements.

The design should feel modern, elegant, mobile-responsive, and premium, while remaining
simple to use.

====================================
BUILD IN PHASES (do not build everything flat/simultaneously)
====================================

PHASE 1 — Core MVP (build this fully, end-to-end, working):
  • Auth (email/password, Google, forgot password, email verification)
  • Business onboarding + profile settings
  • Customer management (profiles, preferences, notes)
  • Manual measurement management (create, edit, history, reuse)
  • Order management with a configurable status workflow (see ORDER WORKFLOW below)
  • Appointment booking + calendar view
  • Quotations and invoices (PDF export)
  • Owner dashboard with core metrics
  • Customer portal (orders, measurements, appointments, invoices, payment history)
  • Global search across customers/orders/appointments/invoices (Postgres full-text search)
  • Admin panel: manage businesses, users, platform settings

PHASE 2 — Commerce & engagement (build after Phase 1 is functional):
  • Payment gateway integration (see PAYMENTS below)
  • Design gallery / digital catalogue with favorites & collections
  • Design customization options (fabric, color, neckline, sleeve, etc. as structured
    attributes on an order — no rendering required yet)
  • Design approval workflow with comments + revision history
  • Delivery management (pickup / home delivery)
  • Reviews & ratings
  • Loyalty program (points, referrals, coupons)
  • Notifications (email now; SMS/WhatsApp/push as stubbed providers behind one interface)
  • Reports (revenue, customer growth, orders, payments, appointments, popular designs;
    export PDF + Excel)

PHASE 3 — Advanced/AI modules (build as ARCHITECTURE + UI + mocked provider only —
do NOT attempt to train or ship a real computer-vision or 3D-rendering model):
  • AI-assisted body measurement estimation
  • 3D garment visualization

Each phase should leave the app in a working, demoable state. Do not leave Phase 1 features
half-implemented in order to start Phase 2/3 work.

====================================
USER ROLES
====================================

1. Super Admin (platform operator)
2. Fashion Business Owner (tenant admin)
3. Staff — scaffold the role/permission model and DB fields now (role enum, permission
   checks in middleware/API layer), but do NOT build a staff-management UI yet. This avoids
   a schema migration later when staff management is added.
4. Customer/Client

====================================
AUTHENTICATION
====================================

• Email & password, Google OAuth, forgot password, email verification, profile management
• Use Auth.js (NextAuth's current name) with the Prisma adapter
• Rate-limit login and password-reset endpoints
• Passwords hashed with bcrypt/argon2 — never store or log plaintext

====================================
OWNER DASHBOARD
====================================

Total Customers, Active Orders, Completed Orders, Upcoming Appointments, Pending Payments,
Monthly Revenue, Recent Orders, Notifications, Quick Actions.

====================================
CUSTOMER MANAGEMENT
====================================

Profile fields: Name, Phone, Email, Address, Birthday, Gender, Preferred Colors, Preferred
Fabrics, Style Preferences, Special Notes.

Maintain: full order history, saved measurements, payment history, appointment history.

====================================
DIGITAL MEASUREMENT MANAGEMENT (Phase 1 = manual only)
====================================

• Manual measurement entry, unlimited saved profiles per customer
• Measurement history with the ability to compare two snapshots over time
• Reuse a previous measurement profile on a new order
• Data model should have a `source` field (`manual` | `ai_estimated`) from day one so Phase 3
  can slot in without a schema change

====================================
AI-ASSISTED BODY MEASUREMENT ESTIMATION (Phase 3 — architecture only)
====================================

Build the full UI and data flow, but implement the estimation step as a swappable
`MeasurementEstimationProvider` interface with ONE mock implementation (e.g. returns
plausible values derived from height/weight/gender using simple ratios) — not a real
computer-vision model. This is a separate ML project; the app should be ready to plug a
real provider in later without UI/schema changes.

Flow: customer uploads front + side full-body photos, provides height/weight/gender →
provider returns estimated Neck, Shoulder, Chest/Bust, Waist, Hip, Sleeve Length, Arm Length,
Inseam, Thigh, Garment Length → designer reviews, edits, and approves before it's saved as a
measurement profile.

Because this involves photos of a person's body, treat it as sensitive personal data:
explicit consent checkbox before upload, encrypted storage, a documented retention/deletion
policy, and the ability for a customer to delete their photos on request.

====================================
APPOINTMENT BOOKING
====================================

Types: Consultation, Measurement, Fitting, Pickup, Virtual Consultation.
Owner-managed availability, automatic reminders, calendar view (FullCalendar).

====================================
DESIGN GALLERY (Phase 2)
====================================

Categories: Men, Women, Bridal, Traditional, Corporate, Casual, Luxury.
Favorites, collections, inspiration image uploads, search, filter.

====================================
ORDER MANAGEMENT
====================================

Customers create custom orders: choose a design, upload inspiration images, add notes,
choose a delivery date, track progress.

ORDER WORKFLOW: model status as an enum/state machine, not a hardcoded linear sequence —
not every order needs every stage (e.g., a ready-made purchase skips Measurement/Fitting).
Default stages: Consultation → Measurement → Design Approval → Production → Fitting →
Alteration → Completed → Ready for Pickup/Delivery. The workflow engine should allow
skipping stages per order type.

====================================
DESIGN CUSTOMIZATION (Phase 2)
====================================

Structured attributes stored per order: Fabric, Color, Neckline, Sleeve Style, Length,
Buttons, Accessories, Embroidery, Custom Notes. Phase 2 = data + a form UI, not a live
rendering. (Live preview arrives in Phase 3 3D module.)

====================================
3D GARMENT VISUALIZATION (Phase 3 — architecture only)
====================================

Build the customer-facing UI (avatar screen, rotation controls, fabric/color/pattern/
neckline/sleeve/length pickers) wired to a `GarmentRenderProvider` interface. Ship ONE
placeholder implementation (e.g. a 2D layered-image compositor that swaps flat-color/pattern
layers on a static garment silhouette per selection) instead of a real 3D engine. Note in
the code where a future Three.js/React Three Fiber (or external rendering service)
implementation would plug in. Do not attempt to build true 3D body-aware rendering.

====================================
DESIGN APPROVAL (Phase 2)
====================================

Approve, Reject, Request Changes, Comment, Revision History. Production locks once a design
is approved (enforce this server-side, not just in the UI).

====================================
QUOTATIONS
====================================

Customer, Garment, Description, Price, Deposit, Balance, Due Date. PDF export via React PDF.

====================================
INVOICES
====================================

Auto-generated from accepted quotations; receipts on payment; PDF download.

====================================
PAYMENTS (Phase 2)
====================================

Build the payment flow (deposit, balance payment, history, status, refund status) behind a
`PaymentProvider` interface so a real gateway can be dropped in. Recommend Paystack or
Flutterwave as the default provider (strong Naira/African market support) with Stripe as an
alternative for international businesses — confirm which with the business owner before
wiring a real key. Never store raw card data; use the gateway's hosted checkout/tokenization.

====================================
CUSTOMER PORTAL
====================================

Orders, Measurements, Appointments, Invoices, Receipts, Payment History, Notifications,
Messages.

====================================
NOTIFICATIONS
====================================

Build one `NotificationProvider` interface. Ship a working Email implementation. Stub SMS
and WhatsApp behind the same interface (log-only) for later integration. Push notifications
optional in Phase 2.

Triggers: appointments, payments, order progress, pickup, delivery.

====================================
DELIVERY MANAGEMENT (Phase 2)
====================================

Pickup or home delivery, delivery address, delivery status, pickup confirmation.

====================================
REVIEWS (Phase 2)
====================================

Rate service, leave review, upload finished-outfit photos.

====================================
LOYALTY PROGRAM (Phase 2)
====================================

Reward points, referral rewards, discount coupons, exclusive offers, repeat-customer perks.

====================================
SETTINGS
====================================

Business Profile, Logo, Working Hours, Social Media, Currency, Measurement Units (metric/
imperial toggle), Brand Colors, Notification Preferences.

====================================
ADMIN PANEL
====================================

Manage Businesses, Users, Subscriptions (define at least 2–3 plan tiers with feature/usage
limits), Reports, Analytics, Platform Settings.

====================================
REPORTS (Phase 2)
====================================

Revenue, Customer Growth, Orders, Payments, Appointments, Popular Designs, Customer
Retention. Export as PDF and Excel (e.g. `exceljs`).

====================================
SEARCH
====================================

Global search across Customers, Orders, Appointments, Measurements, Invoices — Postgres
full-text search is sufficient for MVP; do not introduce a separate search service yet.

====================================
NON-FUNCTIONAL REQUIREMENTS
====================================

• Security: enforce tenant isolation and role permissions server-side on every API route,
  not just in the UI; validate and sanitize all file uploads (type + size limits) for
  inspiration/measurement/review photos.
• Accessibility: keyboard navigable, sufficient color contrast, semantic HTML, alt text on
  uploaded images.
• Performance: paginate all list views (customers, orders, etc.); lazy-load images.
• Testing: include unit tests for business logic (order state machine, payment status
  transitions) and at least one end-to-end test per core flow (signup → create customer →
  create order → invoice).
• Responsive: desktop, tablet, mobile.

====================================
UI DESIGN
====================================

Luxury fashion aesthetic: minimal, elegant, modern, rounded cards, refined typography,
professional icons, soft shadows, smooth animations, premium dashboard feel.

====================================
TECH STACK
====================================

• Frontend + Backend: Next.js (App Router) + React + TypeScript — use Next.js API routes /
  Server Actions as the backend; do not stand up a separate Node/Express server unless you
  have a specific reason to (keeps deployment and auth session handling simple).
• Database: PostgreSQL
• ORM: Prisma
• Auth: Auth.js (NextAuth) with Prisma adapter
• File storage: pick ONE — Cloudinary (recommended: built-in image transforms, simpler for
  a photo-heavy app) or Firebase Storage. Do not wire both.
• Charts: Recharts
• Calendar: FullCalendar
• PDF: React PDF
• Excel export: exceljs
• 3D (Phase 3 placeholder only): Three.js + React Three Fiber
• Deployment target: Vercel (native Next.js fit) + a managed Postgres (e.g. Neon/Supabase)

====================================
OUTPUT
====================================

For Phase 1, generate:
1. Complete database schema (Prisma), with multi-tenancy and the `source` field on
   measurements already in place
2. Folder architecture
3. Full UX flow + wireframes for Phase 1 screens
4. Complete frontend + backend for every Phase 1 feature listed above
5. API routes, auth, and role/tenant permission enforcement
6. Responsive layouts, premium UI
7. Sample seed data (at least 2 demo businesses, customers, orders, appointments)
8. Documentation (setup, environment variables, architecture decisions)
9. Production-ready code (no half-finished features)

Then generate Phase 2, then Phase 3, using the same standard of quality — a working,
demoable slice at the end of each phase, not a partially-wired feature set across all three
at once.

Do not skip features within a phase. Ensure the application is modular, scalable, secure,
accessible, and optimized for performance.
```
