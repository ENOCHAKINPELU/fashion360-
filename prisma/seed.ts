import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("password123", 12);

  // --- Super admin ---
  await prisma.user.upsert({
    where: { email: "admin@fashion360.app" },
    update: {},
    create: {
      email: "admin@fashion360.app",
      name: "Fashion360 Admin",
      passwordHash: password,
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });

  // --- Business 1: Ada Couture ---
  const ada = await prisma.business.upsert({
    where: { slug: "ada-couture" },
    update: {},
    create: {
      name: "Ada Couture",
      slug: "ada-couture",
      currency: "NGN",
      measurementUnit: "metric",
      workingHours: { text: "Mon–Sat, 9am–6pm" },
      socialLinks: { instagram: "@adacouture" },
    },
  });

  await prisma.user.upsert({
    where: { email: "owner@adacouture.com" },
    update: {},
    create: {
      email: "owner@adacouture.com",
      name: "Ada Okafor",
      passwordHash: password,
      role: "OWNER",
      businessId: ada.id,
      emailVerified: new Date(),
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: "chidinma@example.com" },
    update: {},
    create: {
      email: "chidinma@example.com",
      name: "Chidinma Eze",
      passwordHash: password,
      role: "CUSTOMER",
      emailVerified: new Date(),
    },
  });

  const chidinma = await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      businessId: ada.id,
      userId: customerUser.id,
      name: "Chidinma Eze",
      phone: "+2348012345678",
      email: "chidinma@example.com",
      address: "12 Admiralty Way, Lekki, Lagos",
      birthday: new Date("1994-03-12"),
      gender: "female",
      preferredColors: ["Emerald", "Ivory", "Gold"],
      preferredFabrics: ["Silk", "Ankara"],
      stylePreferences: ["Minimal", "Structured"],
      specialNotes: "Prefers high necklines. Allergic to synthetic linings.",
    },
  });

  const bola = await prisma.customer.create({
    data: {
      businessId: ada.id,
      name: "Bola Adeyemi",
      phone: "+2348098765432",
      email: "bola@example.com",
      address: "5 Ikoyi Crescent, Lagos",
      gender: "male",
      preferredColors: ["Navy", "Charcoal"],
      preferredFabrics: ["Wool", "Linen"],
      stylePreferences: ["Classic tailoring"],
    },
  });

  const chidinmaMeasurement = await prisma.measurement.create({
    data: {
      businessId: ada.id,
      customerId: chidinma.id,
      label: "Initial Fitting",
      source: "MANUAL",
      neck: 34,
      shoulder: 38,
      chestBust: 92,
      waist: 74,
      hip: 98,
      sleeveLength: 58,
      armLength: 62,
      inseam: 76,
      thigh: 54,
      garmentLength: 110,
      notes: "Taken at consultation on site.",
    },
  });

  const order1 = await prisma.order.create({
    data: {
      businessId: ada.id,
      customerId: chidinma.id,
      measurementId: chidinmaMeasurement.id,
      orderNumber: "ORD-SEED0001",
      stage: "PRODUCTION",
      requiredStages: ["CONSULTATION", "MEASUREMENT", "DESIGN_APPROVAL", "PRODUCTION", "FITTING", "COMPLETED", "READY_FOR_PICKUP"],
      fabric: "Emerald Silk",
      color: "Emerald",
      neckline: "High neck",
      sleeveStyle: "Long fitted",
      length: "Floor length",
      notes: "Wedding guest gown, needed before Dec 20.",
      deliveryDate: new Date("2026-08-20"),
      price: 185000,
    },
  });

  await prisma.designApproval.create({
    data: { orderId: order1.id, status: "APPROVED", comment: "Loved the sketch, approved as-is." },
  });

  await prisma.order.create({
    data: {
      businessId: ada.id,
      customerId: bola.id,
      orderNumber: "ORD-SEED0002",
      stage: "CONSULTATION",
      requiredStages: ["CONSULTATION", "MEASUREMENT", "DESIGN_APPROVAL", "PRODUCTION", "FITTING", "COMPLETED", "READY_FOR_PICKUP"],
      fabric: "Navy Wool",
      color: "Navy",
      notes: "Two-piece suit for corporate event.",
      price: 220000,
    },
  });

  const now = new Date();
  await prisma.appointment.create({
    data: {
      businessId: ada.id,
      customerId: chidinma.id,
      type: "FITTING",
      status: "CONFIRMED",
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      notes: "Second fitting for wedding guest gown.",
    },
  });

  await prisma.appointment.create({
    data: {
      businessId: ada.id,
      customerId: bola.id,
      type: "CONSULTATION",
      status: "SCHEDULED",
      startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
    },
  });

  const quotation = await prisma.quotation.create({
    data: {
      businessId: ada.id,
      customerId: chidinma.id,
      orderId: order1.id,
      quoteNumber: "QUO-SEED0001",
      status: "ACCEPTED",
      description: "Custom emerald silk wedding guest gown, fully lined, hand-finished hem.",
      price: 185000,
      deposit: 90000,
      balance: 95000,
      dueDate: new Date("2026-08-15"),
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      businessId: ada.id,
      customerId: chidinma.id,
      orderId: order1.id,
      quotationId: quotation.id,
      invoiceNumber: "INV-SEED0001",
      status: "SENT",
      amount: 185000,
      amountPaid: 90000,
      dueDate: new Date("2026-08-15"),
    },
  });

  await prisma.payment.create({
    data: {
      businessId: ada.id,
      customerId: chidinma.id,
      invoiceId: invoice.id,
      type: "DEPOSIT",
      status: "PAID",
      amount: 90000,
      provider: "mock",
      providerRef: "mock_seed_deposit",
      paidAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      businessId: ada.id,
      userId: customerUser.id,
      channel: "EMAIL",
      title: "Your fitting is confirmed",
      body: "Your fitting appointment has been confirmed for this week.",
    },
  });

  // --- Business 2: Bespoke & Co (second tenant, to prove isolation) ---
  const bespoke = await prisma.business.upsert({
    where: { slug: "bespoke-and-co" },
    update: {},
    create: { name: "Bespoke & Co", slug: "bespoke-and-co", currency: "USD" },
  });

  await prisma.user.upsert({
    where: { email: "owner@bespokeandco.com" },
    update: {},
    create: {
      email: "owner@bespokeandco.com",
      name: "Jordan Lee",
      passwordHash: password,
      role: "OWNER",
      businessId: bespoke.id,
      emailVerified: new Date(),
    },
  });

  const alex = await prisma.customer.create({
    data: {
      businessId: bespoke.id,
      name: "Alex Morgan",
      email: "alex@example.com",
      preferredColors: ["Black", "White"],
      preferredFabrics: ["Cotton"],
    },
  });

  await prisma.order.create({
    data: {
      businessId: bespoke.id,
      customerId: alex.id,
      orderNumber: "ORD-SEED0003",
      stage: "MEASUREMENT",
      requiredStages: ["CONSULTATION", "MEASUREMENT", "DESIGN_APPROVAL", "PRODUCTION", "COMPLETED"],
      fabric: "Cotton twill",
      price: 340,
    },
  });

  console.log("Seed complete.");
  console.log("Login as owner: owner@adacouture.com / password123");
  console.log("Login as customer: chidinma@example.com / password123");
  console.log("Login as super admin: admin@fashion360.app / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
