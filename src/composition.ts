import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

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

import { CreatePrismaRsvpToggleRepository } from "./features/RsvpToggle/PrismaRsvpToggleRepository";
import { CreateRsvpToggleService } from "./features/RsvpToggle/RsvpToggleService";
import { CreateRsvpToggleController } from "./features/RsvpToggle/RsvpToggleController";

import { CreateWaitlistPromotionRepository } from "./features/WaitlistPromotion/WaitlistPromotionRepository";
import { CreateWaitlistPromotionService } from "./features/WaitlistPromotion/WaitlistPromotionService";

import { CreateRSVPDashboardService } from "./features/RSVPDashboard/RSVPDashboardService";
import { CreateRSVPDashboardController } from "./features/RSVPDashboard/RSVPDashboardController";

import { createEventService } from "./features/CreateEvent/service/EventService";
import { createEventController } from "./features/CreateEvent/controller/EventController";

import { CreateInMemorySaveForLaterRepository } from "./features/SaveForLater/SaveForLaterRepo";
import { CreateSaveForLaterService } from "./features/SaveForLater/SaveForLaterService";
import { CreateSaveForLaterController } from "./features/SaveForLater/SaveForLaterController";

import { PrismaClient } from "@prisma/client";
import { CreatePrismaEventEditingRepository } from "./features/EventEditing/PrismaEventEditingRepository";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  // ── Shared event store (single source of truth for all event features) ────
  const prisma = new PrismaClient();
  const sharedEventRepo = CreatePrismaEventEditingRepository(prisma);

  // ── Shared RSVP store ─────────────────────────────────────────────────────
  const rsvpToggleRepo = CreatePrismaRsvpToggleRepository(prisma);

  // ── Waitlist promotion (injected into RSVP toggle) ────────────────────────
  const waitlistPromotionRepo = CreateWaitlistPromotionRepository(rsvpToggleRepo);
  const waitlistPromotionService = CreateWaitlistPromotionService(waitlistPromotionRepo);

  // ── Event list ────────────────────────────────────────────────────────────
  const eventListService = CreateEventListService(sharedEventRepo);
  const eventListController = CreateEventListController(eventListService);

  // ── Event editing ─────────────────────────────────────────────────────────
  const eventEditingService = CreateEventEditingService(sharedEventRepo);
  const eventEditingController = CreateEventEditingController(eventEditingService);

  // ── Event publishing / cancellation ──────────────────────────────────────
  const eventPublishingService = CreateEventPublishingService(sharedEventRepo);
  const eventPublishingController = CreateEventPublishingController(eventPublishingService);

  // ── Event detail ──────────────────────────────────────────────────────────
  const eventDetailService = CreateEventDetailService(sharedEventRepo, rsvpToggleRepo);
  const eventDetailController = CreateEventDetailController(eventDetailService, resolvedLogger);

  // ── Past event archiving ──────────────────────────────────────────────────
  const pastArchivingService = CreatePastEventArchivingService(sharedEventRepo);
  const pastArchivingController = CreatePastEventArchivingController(pastArchivingService);

  // ── RSVP toggle ───────────────────────────────────────────────────────────
  const rsvpToggleService = CreateRsvpToggleService(rsvpToggleRepo, sharedEventRepo, waitlistPromotionService);
  const rsvpToggleController = CreateRsvpToggleController(rsvpToggleService);

  // ── RSVP dashboard ────────────────────────────────────────────────────────
  const rsvpDashboardService = CreateRSVPDashboardService(rsvpToggleRepo, sharedEventRepo);
  const rsvpDashboardController = CreateRSVPDashboardController(rsvpDashboardService);

  // ── Create event ──────────────────────────────────────────────────────────
  const createEvtService = createEventService(sharedEventRepo);
  const createEvtController = createEventController(createEvtService, resolvedLogger);

  // ── Save for later ────────────────────────────────────────────────────────
  const saveForLaterRepo = CreateInMemorySaveForLaterRepository();
  const saveForLaterService = CreateSaveForLaterService(saveForLaterRepo, sharedEventRepo);
  const saveForLaterController = CreateSaveForLaterController(saveForLaterService, resolvedLogger);

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
    resolvedLogger,
  );
}
