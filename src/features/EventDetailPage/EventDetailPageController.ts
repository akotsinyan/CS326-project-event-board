import type { Response } from "express";
import type { UserRole } from "../../auth/User";
import type { ILoggingService } from "../../service/LoggingService";
import type { IEventDetailPageService } from "./EventDetailPageService";
import type { EventDetailError } from "./errors";

// ── Interface ──────────────────────────────────────────────────

export interface IEventDetailController {
  showEvent(
    res: Response,
    eventId: string,
    user: { userId: string; role: UserRole }
  ): Promise<void>;
}

// ── Implementation ─────────────────────────────────────────────

class EventDetailController implements IEventDetailController {
  constructor(
    private readonly service: IEventDetailPageService,
    private readonly logger: ILoggingService
  ) { }

  private mapErrorStatus(error: EventDetailError): number {
    if (error.name === "EventNotFound") return 404;
    if (error.name === "AuthorizationRequired") return 403;
    return 500;
  }

  async showEvent(
    res: Response,
    eventId: string,
    user: { userId: string; role: UserRole }
  ): Promise<void> {
    this.logger.info(`GET /events/${eventId}`);

    const result = await this.service.getEventById(
      eventId,
      user.userId,
      user.role
    );

    if (!result.ok) {
      const error = result.value as EventDetailError;
      const status = this.mapErrorStatus(error);

      const log = status >= 500 ? this.logger.error : this.logger.warn;
      log.call(this.logger, `Event detail failed: ${error.message}`);

      res.status(status).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    const event = result.value;

    res.render("events/detail", {
      event,
      pageError: null,
      canEdit: user.role === "admin" || user.userId === event.organizerId,
      canCancel: user.role === "admin" || user.userId === event.organizerId,
      canRsvp: user.role === "user",
      canSave: user.role === "user",
    });
  }
}

// ── Factory ───────────────────────────────────────────────────

export function CreateEventDetailController(
  service: IEventDetailPageService,
  logger: ILoggingService
): IEventDetailController {
  return new EventDetailController(service, logger);
}