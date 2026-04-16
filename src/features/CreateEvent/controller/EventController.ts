import type { Request, Response } from "express";
import type { IAppBrowserSession, AppSessionStore } from "../../../session/AppSession";
import { getAuthenticatedUser, touchAppSession } from "../../../session/AppSession";
import type { IEventService, EventError } from "../service/EventService";
import type { ILoggingService } from "../../../service/LoggingService";

export interface IEventController {
  renderCreateEventPage(req: Request, res: Response, pageError?: string): void;
  create(req: Request, res: Response, session: IAppBrowserSession): Promise<void>;
  search(req: Request, res: Response): Promise<void>;
}

class EventController implements IEventController {
  constructor(
    private readonly service: IEventService,
    private readonly logger: ILoggingService,
  ) {}

  private mapErrorStatus(error: EventError): number {
    return error.name === "ValidationError" ? 400 : 500;
  }

  renderCreateEventPage(req: Request, res: Response, pageError?: string): void {
    const session = touchAppSession(req.session as AppSessionStore);
    res.render("events/new", { session, pageError: pageError ?? null });
  }

  async create(req: Request, res: Response, session: IAppBrowserSession): Promise<void> {
    const { title, description, location, startDatetime, endDatetime, category, capacity } = req.body;
    const organizerId = session.authenticatedUser?.userId ?? "";
    const organizerName = session.authenticatedUser?.displayName ?? "";

    const result = await this.service.createEvent({
      title: typeof title === "string" ? title : "",
      description: typeof description === "string" ? description : "",
      location: typeof location === "string" ? location : "",
      startDatetime: new Date(startDatetime),
      endDatetime: new Date(endDatetime),
      organizerId,
      organizerName,
      category: typeof category === "string" ? category : undefined,
      capacity: capacity ? parseInt(capacity, 10) : null,
    });

    if (!result.ok) {
      const error = result.value as EventError;
      const status = this.mapErrorStatus(error);
      this.logger.warn(`Create event failed: ${error.message}`);
      res.status(status).render("events/new", { session, pageError: error.message });
      return;
    }

    this.logger.info(`Event created: ${result.value.id}`);
    res.redirect("/events");
  }

  async search(req: Request, res: Response): Promise<void> {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    this.logger.info(`Event search: "${query}"`);

    // Delegate to the event list with a search filter; renders the same index view.
    res.redirect(`/events?q=${encodeURIComponent(query)}`);
  }
}

export function createEventController(
  service: IEventService,
  logger: ILoggingService,
): IEventController {
  return new EventController(service, logger);
}
