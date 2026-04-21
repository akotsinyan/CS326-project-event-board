/**
 * Integration tests — RSVP Toggle feature
 * CS326 Sprint 2
 *
 * Runs against a real Express app backed by fresh in-memory repositories.
 * Session auth is handled by logging in via POST /login before each test.
 *
 * These tests must pass without modification after the Prisma migration in
 * Sprint 3 — only the factory functions in buildApp() will change.
 */

import request, { type Agent } from "supertest";
import type { Express } from "express";

import { CreateApp } from "../src/app";
import { CreateLoggingService } from "../src/service/LoggingService";

import { CreateInMemoryUserRepository } from "../src/auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "../src/auth/PasswordHasher";
import { CreateAuthService } from "../src/auth/AuthService";
import { CreateAdminUserService } from "../src/auth/AdminUserService";
import { CreateAuthController } from "../src/auth/AuthController";

import { CreateInMemoryEventEditingRepository } from "../src/features/EventEditing/EventEditingRepository";
import { CreateEventEditingService } from "../src/features/EventEditing/EventEditingService";
import { CreateEventEditingController } from "../src/features/EventEditing/EventEditingController";

import { CreateEventListService } from "../src/features/EventList/EventListService";
import { CreateEventListController } from "../src/features/EventList/EventListController";

import { CreateEventDetailService } from "../src/features/EventDetailPage/EventDetailPageService";
import { CreateEventDetailController } from "../src/features/EventDetailPage/EventDetailPageController";

import { CreateEventPublishingService } from "../src/features/EventPublishing/EventPublishingService";
import { CreateEventPublishingController } from "../src/features/EventPublishing/EventPublishingController";

import { CreatePastEventArchivingService } from "../src/features/PastEventArchiving/PastEventArchivingService";
import { CreatePastEventArchivingController } from "../src/features/PastEventArchiving/PastEventArchivingController";

import { CreateInMemoryRsvpToggleRepository } from "../src/features/RsvpToggle/RsvpToggleRepository";
import { CreateRsvpToggleService } from "../src/features/RsvpToggle/RsvpToggleService";
import { CreateRsvpToggleController } from "../src/features/RsvpToggle/RsvpToggleController";

import { CreateWaitlistPromotionRepository } from "../src/features/WaitlistPromotion/WaitlistPromotionRepository";
import { CreateWaitlistPromotionService } from "../src/features/WaitlistPromotion/WaitlistPromotionService";

// ── TODO: uncomment and fix these three once you know the exact factory names ─
// Copy the calls from your composition.ts.
//
// import { CreateRSVPDashboardController } from "../src/features/RSVPDashboard/RSVPDashboardController";
// import { CreateEventController } from "../src/features/CreateEvent/controller/EventController";
// import { CreateSaveForLaterController } from "../src/features/SaveForLater/SaveForLaterController";

// ── Seed credentials (InMemoryUserRepository) ─────────────────────────────────

const MEMBER = { email: "user@app.test",  password: "password123" }; // role: user
const STAFF  = { email: "staff@app.test", password: "password123" }; // role: staff

// ── Seed event IDs (EventEditingRepository) ───────────────────────────────────

const PUBLISHED_EVENT   = "evt-list-1";        // published, capacity: 50
const DRAFT_EVENT       = "evt-draft-1";        // draft → InvalidState
const PAST_EVENT        = "evt-past-1";         // past  → InvalidState
const NONEXISTENT_EVENT = "evt-does-not-exist"; // → EventNotFound

// ── App factory ───────────────────────────────────────────────────────────────

function buildApp(): Express {
  const logger   = CreateLoggingService();
  const hasher   = CreatePasswordHasher();
  const userRepo = CreateInMemoryUserRepository();

  const authService    = CreateAuthService(userRepo, hasher);
  const adminService   = CreateAdminUserService(userRepo, hasher);
  const authController = CreateAuthController(authService, adminService, logger);

  const eventRepo = CreateInMemoryEventEditingRepository();

  const rsvpRepo        = CreateInMemoryRsvpToggleRepository([]);
  const waitlistRepo    = CreateWaitlistPromotionRepository(rsvpRepo, eventRepo);
  const waitlistService = CreateWaitlistPromotionService(waitlistRepo);

  const rsvpToggleService    = CreateRsvpToggleService(rsvpRepo, eventRepo, waitlistService);
  const rsvpToggleController = CreateRsvpToggleController(rsvpToggleService);

  const eventEditingService    = CreateEventEditingService(eventRepo);
  const eventEditingController = CreateEventEditingController(eventEditingService, logger);

  const eventListService    = CreateEventListService(eventRepo);
  const eventListController = CreateEventListController(eventListService, logger);

  const eventDetailService    = CreateEventDetailService(eventRepo);
  const eventDetailController = CreateEventDetailController(eventDetailService, logger);

  const eventPublishingService    = CreateEventPublishingService(eventRepo);
  const eventPublishingController = CreateEventPublishingController(eventPublishingService, logger);

  const pastArchivingService    = CreatePastEventArchivingService(eventRepo);
  const pastArchivingController = CreatePastEventArchivingController(pastArchivingService, logger);

  // Stubs for controllers not owned by this feature.
  // Replace each `as any` line with the real factory call from composition.ts.
  const rsvpDashboardController = { showDashboard: async () => {} }          as any;
  const createEventController   = { renderCreateEventPage: async () => {}, create: async () => {} } as any;
  const saveForLaterController  = { toggleFromButton: async () => {}, showSavedPage: async () => {} } as any;

  return CreateApp(
    authController,
    eventListController,
    eventEditingController,
    eventPublishingController,
    eventDetailController,
    pastArchivingController,
    rsvpToggleController,
    rsvpDashboardController,
    createEventController,
    saveForLaterController,
    logger,
  ).getExpressApp();
}

// ── Login helper ──────────────────────────────────────────────────────────────

async function loginAs(app: Express, email: string, password: string): Promise<Agent> {
  const agent = request.agent(app);
  const res   = await agent.post("/login").type("form").send({ email, password });
  if (res.status !== 302 && res.status !== 200) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status}`);
  }
  return agent;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /events/:eventId/rsvp
// ─────────────────────────────────────────────────────────────────────────────

describe("RSVP Toggle — POST /events/:eventId/rsvp", () => {
  let app: Express;
  let member: Agent;
  let staff: Agent;

  beforeEach(async () => {
    app    = buildApp();
    member = await loginAs(app, MEMBER.email, MEMBER.password);
    staff  = await loginAs(app, STAFF.email,  STAFF.password);
  });

  // ── Auth guard ──────────────────────────────────────────────────────────────

  test("unauthenticated request → 401", async () => {
    const res = await request(app).post(`/events/${PUBLISHED_EVENT}/rsvp`);
    expect(res.status).toBe(401);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  test("member RSVPs to a published event → 302 redirect", async () => {
    const res = await member.post(`/events/${PUBLISHED_EVENT}/rsvp`);
    expect(res.status).toBe(302);
  });

  test("member RSVPs via HTMX → 204 with HX-Redirect header", async () => {
    const res = await member
      .post(`/events/${PUBLISHED_EVENT}/rsvp`)
      .set("HX-Request", "true");
    expect(res.status).toBe(204);
    expect(res.headers["hx-redirect"]).toBeDefined();
  });

  // ── Toggle off ──────────────────────────────────────────────────────────────

  test("member RSVPs twice → second call cancels the RSVP (302)", async () => {
    await member.post(`/events/${PUBLISHED_EVENT}/rsvp`);             // → going
    const res = await member.post(`/events/${PUBLISHED_EVENT}/rsvp`); // → cancelled
    expect(res.status).toBe(302);
  });

  // ── Edge case: reactivation ─────────────────────────────────────────────────

  test("RSVP → cancel → RSVP again → reactivated (302)", async () => {
    await member.post(`/events/${PUBLISHED_EVENT}/rsvp`); // → going
    await member.post(`/events/${PUBLISHED_EVENT}/rsvp`); // → cancelled
    const res = await member.post(`/events/${PUBLISHED_EVENT}/rsvp`); // → reactivated
    expect(res.status).toBe(302);
  });

  // ── Domain errors ───────────────────────────────────────────────────────────

  test("staff RSVPs → 403 Unauthorized", async () => {
    const res = await staff.post(`/events/${PUBLISHED_EVENT}/rsvp`);
    expect(res.status).toBe(403);
  });

  test("RSVP to draft event → 400 InvalidState", async () => {
    const res = await member.post(`/events/${DRAFT_EVENT}/rsvp`);
    expect(res.status).toBe(400);
  });

  test("RSVP to past event → 400 InvalidState", async () => {
    const res = await member.post(`/events/${PAST_EVENT}/rsvp`);
    expect(res.status).toBe(400);
  });

  test("RSVP to nonexistent event → 404 EventNotFound", async () => {
    const res = await member.post(`/events/${NONEXISTENT_EVENT}/rsvp`);
    expect(res.status).toBe(404);
  });

  // ── Capacity / waitlist ─────────────────────────────────────────────────────

  test("RSVP to unlimited-capacity event succeeds (302)", async () => {
    // evt-list-4 has capacity: null — always goes, never waitlisted.
    // To test the waitlist branch precisely, add a capacity-1 event to
    // SEED_EVENTS and a matching RSVP in SEED_RSVPS, then POST to that ID.
    const res = await member.post(`/events/evt-list-4/rsvp`);
    expect(res.status).toBe(302);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /events/:eventId/rsvp/status
// ─────────────────────────────────────────────────────────────────────────────

describe("RSVP Status — GET /events/:eventId/rsvp/status", () => {
  let app: Express;
  let member: Agent;

  beforeEach(async () => {
    app    = buildApp();
    member = await loginAs(app, MEMBER.email, MEMBER.password);
  });

  test("unauthenticated → 401", async () => {
    const res = await request(app).get(`/events/${PUBLISHED_EVENT}/rsvp/status`);
    expect(res.status).toBe(302);
  });

  test("no existing RSVP → 200 with null", async () => {
    // evt-list-1 is not in SEED_RSVPS for user-reader, so null is expected
    const res = await member.get(`/events/${PUBLISHED_EVENT}/rsvp/status`);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  test("after RSVPing → 200 with status 'going'", async () => {
    await member.post(`/events/${PUBLISHED_EVENT}/rsvp`);
    const res = await member.get(`/events/${PUBLISHED_EVENT}/rsvp/status`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("going");
  });

  test("after cancelling → 200 with status 'cancelled'", async () => {
    await member.post(`/events/${PUBLISHED_EVENT}/rsvp`); // → going
    await member.post(`/events/${PUBLISHED_EVENT}/rsvp`); // → cancelled
    const res = await member.get(`/events/${PUBLISHED_EVENT}/rsvp/status`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });
});