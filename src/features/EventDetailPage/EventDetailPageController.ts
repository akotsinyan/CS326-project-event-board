import type { Request, Response } from "express";
import type { UserRole } from "../../auth/User";
import type { ILoggingService } from "../../service/LoggingService";
import type { IEventDetailPageService } from "./EventDetailPageService";
import type { EventDetailError } from "./errors";
import { getAuthenticatedUser, touchAppSession } from "../../session/AppSession";
import type { AppSessionStore } from "../../session/AppSession";

// ── Interface ──────────────────────────────────────────────────

export interface IEventDetailController {
  showEvent(req: Request, res: Response): Promise<void>;
}

// ── Implementation ─────────────────────────────────────────────

class EventDetailController implements IEventDetailController {
  constructor(
    private readonly service: IEventDetailPageService,
    private readonly logger: ILoggingService,
  ) {}

  private mapErrorStatus(error: EventDetailError): number {
    if (error.name === "EventNotFound") return 404;
    if (error.name === "AuthorizationRequired") return 403;
    return 500;
  }

  async showEvent(req: Request, res: Response): Promise<void> {
    const store = req.session as AppSessionStore;
    const session = touchAppSession(store);
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      res.redirect("/login");
      return;
    }

    const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";
    this.logger.info(`GET /events/${eventId}`);

    const result = await this.service.getEventById(eventId, currentUser.userId, currentUser.role);

    if (!result.ok) {
      const error = result.value as EventDetailError;
      const status = this.mapErrorStatus(error);
      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `Event detail failed: ${error.message}`);
      res.status(status).render("partials/error", { message: error.message, layout: false });
      return;
    }

    const event = result.value;
    const isOrganizer = currentUser.userId === event.organizerId;
    const isAdmin = currentUser.role === "admin";

    res.render("events/detail", {
      session,
      event,
      pageError: null,
      canEdit: isAdmin || (currentUser.role === "staff" && isOrganizer),
      canPublish: (isAdmin || isOrganizer) && event.status === "draft",
      canCancel: (isAdmin || isOrganizer) && event.status === "published",
      canRsvp: currentUser.role === "user" && event.status === "published",
      canSave: currentUser.role === "user",
      rsvpStatus: event.currentUserRsvpStatus,
      waitlistPosition: event.waitlistPosition,
    });
  }
}

// ── Factory ───────────────────────────────────────────────────

export function CreateEventDetailController(
  service: IEventDetailPageService,
  logger: ILoggingService,
): IEventDetailController {
  return new EventDetailController(service, logger);
}
