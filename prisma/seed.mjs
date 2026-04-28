// Idempotent seed script — safe to run multiple times.
// Run: node prisma/seed.mjs
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually (dotenv/config expects CWD to have .env)
try {
  const envPath = path.resolve(__dirname, "../.env");
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {}

const rawUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const filePath = rawUrl.replace(/^file:/, "");
const dbPath = path.isAbsolute(filePath)
  ? filePath
  : path.resolve(__dirname, "../", filePath);

const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

// ── Helpers ───────────────────────────────────────────────────────────────────

const now = new Date();

function daysFromNow(days) {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d;
}

function hoursAfter(start, hours) {
  const d = new Date(start);
  d.setHours(d.getHours() + hours);
  return d;
}

function nextWeekday(targetDay) {
  const d = new Date(now);
  const diff = (targetDay - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(10, 0, 0, 0);
  return d;
}

const saturday = nextWeekday(6);
const sunday = nextWeekday(now.getDay() === 0 ? 7 : 0);

// ── Seed data ─────────────────────────────────────────────────────────────────

const USERS = [
  {
    id: "user-admin",
    email: "admin@app.test",
    displayName: "Avery Admin",
    role: "admin",
    passwordHash:
      "52bd54710a468b70e447a45d4e6cfae3:ff273e3cdedbc54045ac368d1f1955e4f6f6e177d63df6fb72440e4045cf756a6f93d16710b2542c725755d9df4960977204f4b580ce184f6242419b659973bf",
  },
  {
    id: "user-staff",
    email: "staff@app.test",
    displayName: "Sam Staff",
    role: "staff",
    passwordHash:
      "5e12e1f3a75b4c2300e26eaaeda137a7:32dcbbe1d8785ced8009479e0705325bc5c425f8b69cd6c4abd6298aca4468d5564cdfaf9b8a02efa330a9d7d80e885842185ca29b5415f5c7e11b1e467324f7",
  },
  {
    id: "user-reader",
    email: "user@app.test",
    displayName: "Una User",
    role: "user",
    passwordHash:
      "2b3bbad4e6798f50a57dba85090dcf6b:9ff6bd0f903e8df9fec42b869554f2bdcfa373690da56432623b82b0173aaf9371716d7fee6734e7080bd3021ed18af49ce723081e20180abdd2d0835f44d301",
  },
];

const EVENTS = [
  {
    id: "evt-list-1",
    title: "Spring Hackathon",
    description: "An all-day coding challenge open to all skill levels. Form a team and build something cool.",
    location: "Room 101",
    category: "tech",
    status: "published",
    capacity: 50,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(2),
    endDatetime: hoursAfter(daysFromNow(2), 8),
  },
  {
    id: "evt-list-2",
    title: "Career Fair",
    description: "Meet recruiters and hiring managers from top companies across the industry.",
    location: "Main Hall",
    category: "careers",
    status: "published",
    capacity: 200,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(3),
    endDatetime: hoursAfter(daysFromNow(3), 6),
  },
  {
    id: "evt-list-3",
    title: "Open Mic Night",
    description: "Share your talent — comedy, music, poetry, or anything you love performing.",
    location: "Student Union",
    category: "social",
    status: "published",
    capacity: 60,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: saturday,
    endDatetime: hoursAfter(saturday, 3),
  },
  {
    id: "evt-list-4",
    title: "Sunday Study Hall",
    description: "A quiet, collaborative study session. Tutors will be on hand for several subjects.",
    location: "Library",
    category: "academic",
    status: "published",
    capacity: null,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: sunday,
    endDatetime: hoursAfter(sunday, 4),
  },
  {
    id: "evt-list-5",
    title: "Tech Talk: AI Trends",
    description: "A panel discussion on the latest advances in AI and what they mean for students and industry.",
    location: "Lecture Hall A",
    category: "tech",
    status: "published",
    capacity: 120,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(10),
    endDatetime: hoursAfter(daysFromNow(10), 2),
  },
  {
    id: "evt-list-6",
    title: "Board Game Night",
    description: "Casual board game night with a huge library of games to choose from.",
    location: "Commons Room",
    category: "social",
    status: "published",
    capacity: null,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(5),
    endDatetime: hoursAfter(daysFromNow(5), 3),
  },
  {
    id: "evt-draft-1",
    title: "End-of-Year Gala",
    description: "Annual end-of-year celebration. Details TBD.",
    location: "Grand Ballroom",
    category: "social",
    status: "draft",
    capacity: 300,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(30),
    endDatetime: hoursAfter(daysFromNow(30), 4),
  },
  {
    id: "evt-past-1",
    title: "Winter Networking Mixer",
    description: "An evening of networking and light refreshments.",
    location: "Rooftop Lounge",
    category: "social",
    status: "past",
    capacity: null,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(-14),
    endDatetime: hoursAfter(daysFromNow(-14), 3),
  },
  {
    id: "evt-past-2",
    title: "Resume Workshop",
    description: "Get your resume reviewed by career coaches and industry professionals.",
    location: "Career Center",
    category: "careers",
    status: "past",
    capacity: null,
    organizerId: "user-staff",
    organizerName: "Sam Staff",
    startDatetime: daysFromNow(-7),
    endDatetime: hoursAfter(daysFromNow(-7), 2),
  },
];

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

const RSVPS = [
  { id: "rsvp-seed-1", userId: "user-reader", eventId: "evt-list-1", status: "going",      createdAt: daysAgo(5) },
  { id: "rsvp-seed-2", userId: "user-reader", eventId: "evt-list-2", status: "waitlisted", createdAt: daysAgo(4) },
  { id: "rsvp-seed-3", userId: "user-reader", eventId: "evt-list-5", status: "going",      createdAt: daysAgo(3) },
  { id: "rsvp-seed-4", userId: "user-reader", eventId: "evt-past-1", status: "going",      createdAt: daysAgo(20) },
  { id: "rsvp-seed-5", userId: "user-reader", eventId: "evt-past-2", status: "cancelled",  createdAt: daysAgo(10) },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  for (const u of USERS) {
    await prisma.user.upsert({ where: { id: u.id }, update: {}, create: u });
  }
  console.log(`Seeded ${USERS.length} users`);

  for (const e of EVENTS) {
    await prisma.event.upsert({ where: { id: e.id }, update: {}, create: e });
  }
  console.log(`Seeded ${EVENTS.length} events`);

  for (const r of RSVPS) {
    await prisma.rsvp.upsert({ where: { id: r.id }, update: {}, create: r });
  }
  console.log(`Seeded ${RSVPS.length} RSVPs`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
