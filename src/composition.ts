import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

import { CreateInMemoryEventEditingRepository } from "./features/EventEditing/EventEditingRepository";
import { CreateEventEditingService } from "./features/EventEditing/EventEditingService";
import { CreateEventEditingController } from "./features/EventEditing/EventEditingController";

import { CreateEventListService } from "./features/EventList/EventListService";
import { CreateEventListController } from "./features/EventList/EventListController";

import { CreateEventDetailService } from "./features/EventDetailPage/EventDetailPageService";
import { CreateEventDetailController } from "./features/EventDetailPage/EventDetailPageController";

import { CreateEventPublishingService } from "./features/EventPublishing/EventPublishingService";
import { CreateEventPublishingController } from "./features/EventPublishing/EventPublishingController";

import { CreatePastEventArchivingService } from "./features/PastEventArchiving/PastEventArchivingService";
import { CreatePastEventArchivingController } from "./features/PastEventArchiving/PastEventArchivingController";

import { CreateInMemoryRsvpToggleRepository } from "./features/RsvpToggle/RsvpToggleRepository";
import { CreateRsvpToggleService } from "./features/RsvpToggle/RsvpToggleService";
import { CreateRsvpToggleController } from "./features/RsvpToggle/RsvpToggleController";

import { CreateWaitlistPromotionRepository } from "./features/WaitlistPromotion/WaitlistPromotionRepository";
import { CreateWaitlistPromotionService } from "./features/WaitlistPromotion/WaitlistPromotionService";
import { CreateWaitlistPromotionController } from "./features/WaitlistPromotion/WaitlistPromotionController";

import { CreateRSVPDashboardService } from "./features/RSVPDashboard/RSVPDashboardService";
import { CreateRSVPDashboardController } from "./features/RSVPDashboard/RSVPDashboardController";

import { createEventService } from "./features/CreateEvent/service/EventService";
import { createEventController } from "./features/CreateEvent/controller/EventController";

import { CreateInMemorySaveForLaterRepository } from "./features/SaveForLater/SaveForLaterRepo";
import { CreateSaveForLaterService } from "./features/SaveForLater/SaveForLaterService";
import { CreateSaveForLaterController } from "./features/SaveForLater/SaveForLaterController";
import { CreatePrismaSaveForLaterRepository } from "./features/SaveForLater/SaveForLaterPrismaRepo";
import { CreatePrismaEventEditingRepository } from "./features/EventEditing/EventEditingPrismaRepo";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

export function createComposedApp(
  mode: "memory" | "prisma",
  logger?: ILoggingService,
): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(
    authService,
    adminUserService,
    resolvedLogger,
  );

  // ── Shared event store (single source of truth for all event features) ────
  const sharedEventRepo =
    mode === "prisma"
      ? CreatePrismaEventEditingRepository(
          new PrismaClient({
            adapter: new PrismaBetterSqlite3({
              url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
            }),
          }),
        )
      : CreateInMemoryEventEditingRepository();

  // ── Shared RSVP store ─────────────────────────────────────────────────────
  const rsvpToggleRepo = CreateInMemoryRsvpToggleRepository();

  // ── Waitlist promotion (injected into RSVP toggle) ────────────────────────
  const waitlistPromotionRepo =
    CreateWaitlistPromotionRepository(rsvpToggleRepo);
  const waitlistPromotionService = CreateWaitlistPromotionService(
    waitlistPromotionRepo,
  );
  const waitlistPromotionController = CreateWaitlistPromotionController(
    waitlistPromotionService,
  );

  // ── Event list ────────────────────────────────────────────────────────────
  const eventListService = CreateEventListService(sharedEventRepo);
  const eventListController = CreateEventListController(eventListService);

  // ── Event editing ─────────────────────────────────────────────────────────
  const eventEditingService = CreateEventEditingService(sharedEventRepo);
  const eventEditingController =
    CreateEventEditingController(eventEditingService);

  // ── Event publishing / cancellation ──────────────────────────────────────
  const eventPublishingService = CreateEventPublishingService(sharedEventRepo);
  const eventPublishingController = CreateEventPublishingController(
    eventPublishingService,
  );

  // ── Save for later ────────────────────────────────────────────────────────
  const saveForLaterRepo =
    mode === "prisma"
      ? CreatePrismaSaveForLaterRepository(
          new PrismaClient({
            adapter: new PrismaBetterSqlite3({
              url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
            }),
          }),
        )
      : CreateInMemorySaveForLaterRepository();
  const saveForLaterService = CreateSaveForLaterService(
    saveForLaterRepo,
    sharedEventRepo,
  );
  const saveForLaterController = CreateSaveForLaterController(
    saveForLaterService,
    resolvedLogger,
  );

  // ── Event detail ──────────────────────────────────────────────────────────
  const eventDetailService = CreateEventDetailService(
    sharedEventRepo,
    rsvpToggleRepo,
    saveForLaterRepo,
  );
  const eventDetailController = CreateEventDetailController(
    eventDetailService,
    resolvedLogger,
  );

  // ── Past event archiving ──────────────────────────────────────────────────
  const pastArchivingService = CreatePastEventArchivingService(sharedEventRepo);
  const pastArchivingController =
    CreatePastEventArchivingController(pastArchivingService);

  // ── RSVP toggle ───────────────────────────────────────────────────────────
  const rsvpToggleService = CreateRsvpToggleService(
    rsvpToggleRepo,
    sharedEventRepo,
    waitlistPromotionService,
  );
  const rsvpToggleController = CreateRsvpToggleController(
    rsvpToggleService,
    sharedEventRepo,
  );

  // ── RSVP dashboard ────────────────────────────────────────────────────────
  const rsvpDashboardService = CreateRSVPDashboardService(
    rsvpToggleRepo,
    sharedEventRepo,
  );
  const rsvpDashboardController =
    CreateRSVPDashboardController(rsvpDashboardService);

  // ── Create event ──────────────────────────────────────────────────────────
  const createEvtService = createEventService(sharedEventRepo);
  const createEvtController = createEventController(
    createEvtService,
    resolvedLogger,
  );

  return CreateApp(
    authController,
    eventListController,
    eventEditingController,
    eventPublishingController,
    eventDetailController,
    pastArchivingController,
    rsvpToggleController,
    rsvpDashboardController,
    createEvtController,
    saveForLaterController,
    waitlistPromotionController,
    resolvedLogger,
  );
}
